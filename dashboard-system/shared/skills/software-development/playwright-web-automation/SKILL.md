---
name: playwright-web-automation
description: Automate browser interactions for web-only AI platforms that lack public APIs — reverse-engineer JS bundles for internal endpoints, bypass Cloudflare, persist session cookies, and handle reCAPTCHA/login walls.
version: 1.0.0
author: Hermes Agent
tags: [playwright, browser-automation, scraping, reverse-engineering, web-ui, cloudflare, recaptcha]
platforms: [linux, macos, windows-wsl]
related_skills: [web-access]
---

# Playwright Web Automation

Use Playwright (already installed in the Hermes environment) to interact with JS-heavy web applications that don't expose public APIs. This covers the full pipeline: finding internal API endpoints via JS bundle analysis, browser session management, Cloudflare bypass, and cookie persistence for authenticated sessions.

## When to Use

- A web platform has no public API but you need to interact with it programmatically
- The target site uses JavaScript-heavy rendering (Next.js, React, SPA)
- You need to bypass Cloudflare challenge pages
- You want to save a browser session for reuse (cookies, localStorage)
- The target has internal API endpoints that the frontend calls, which could be used directly with the right cookies

### Prefer simpler tools for simpler targets

| Target type | Tool | Why |
|---|---|---|
| Static HTML, simple JSON API | `curl`, `requests` | Faster, lighter |
| Any page without JS rendering | `curl` + `grep` / `python html.parser` | No browser overhead |
| JS-rendered page, needs interaction | Playwright | Required for JS execution |
| JS-rendered page, read-only content | Playwright + `page.content()` | Minimal interaction |

## Prerequisites

Playwright is already available in the Hermes environment:

```bash
python3 -c "from playwright.sync_api import sync_playwright; print('OK')"
python3 -m playwright install chromium  # one-time, if not cached
```

Check installed browsers:
```bash
ls ~/.cache/ms-playwright/
```

## Workflow: Reverse-Engineering a Web-Only Platform

### Phase 1: Reconnaissance (check for hidden APIs first)

```bash
# 1. Basic HTTP check
curl -s -o /dev/null -w "%{http_code}" "https://target.com"

# 2. Check internal API endpoint candidates
curl -s -o /dev/null -w "%{http_code}" "https://target.com/api/me"
curl -s -o /dev/null -w "%{http_code}" "https://target.com/api/chat"

# 3. Extract JS bundle URLs from the page HTML
curl -sL "https://target.com/page" | grep -oP '_next/static/chunks/[^"]*\.js'

# 4. Grep JS bundles for internal API routes
curl -s "https://target.com/_next/static/chunks/XXXX.js" | grep -oP '"/api/[^"]*"' | sort -u
curl -s "https://target.com/_next/static/chunks/XXXX.js" | grep -oP '"/nextjs-api/[^"]*"' | sort -u
```

**What to look for in JS bundles:**
- `"/api/..."` — standard API routes
- `"/nextjs-api/..."` — Next.js API routes (common on arena.ai-style apps)
- `"/v1/..."` or `"/v2/..."` — versioned API
- `fetch("/...", {method:"POST"...})` — POST endpoints with payload structure
- `modelIds`, `modality`, `mode` — parameter patterns specific to the app
- `recaptchaV2Token`, `recaptchaV3Token` — auth requirement indicators

### Phase 2: Browser Session with Playwright

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    )
    page = context.new_page()
    
    # Navigate, wait for content
    page.goto("https://target.com/page", timeout=30000, wait_until="networkidle")
    page.wait_for_timeout(5000)  # let JS finish
    
    # Check page state
    print(page.title())
    print(page.inner_text('body')[:500])
    
    # Take screenshot for visual inspection
    page.screenshot(path='/tmp/debug.png')
    
    # Execute JS in page context (e.g., to call internal API with session cookies)
    result = page.evaluate("""
        async () => {
            const resp = await fetch('/api/endpoint');
            return await resp.text();
        }
    """)
    
    browser.close()
```

### Phase 3: Handle Common Roadblocks

**Cloudflare challenge page:**
- Playwright typically passes Cloudflare challenges automatically (has real browser fingerprint)
- If stuck: try `page.goto(url, wait_until="networkidle")` with longer timeout
- After passing, check for `cf_clearance` cookie — means you're through
- Detection: check if `"cf-browser-verification"` in `page.content()` or `"challenge"` in body text

**reCAPTCHA (Google):**
- CANNOT be solved automatically by Playwright
- If reCAPTCHA blocks the page, you need human intervention
- Workaround: have the user log in once in THEIR browser, export session cookies, you reuse them
- Detection: "Security Verification" text, "I'm not a robot" iframe, reCAPTCHA widget

**Login wall (authenticated-only features):**
- Many web-only AI platforms require login even for basic use
- Free accounts often exist — user needs to register once
- After login: export cookies → save → reuse

### Phase 4: Session Cookie Persistence

Save cookies after a successful manual login, then reuse in future sessions:

```python
# Save after user logs in
cookies = context.cookies()
context.storage_state(path="/tmp/arena_session.json")

# Reuse in future sessions
context = browser.new_context(storage_state="/tmp/arena_session.json")
```

To get session cookies from the user's browser (when manual login is needed):

> "Open the browser console (F12), type: `document.cookie` and paste the output here."

Then save the cookies into storage_state format:

```python
# Parse user's cookie string into Playwright storage_state format
cookies = []
for item in cookie_string.split(";"):
    if "=" in item:
        name, value = item.strip().split("=", 1)
        cookies.append({
            "name": name, "value": value,
            "domain": ".target.com", "path": "/",
            "httpOnly": False, "secure": True
        })
context = browser.new_context(storage_state={"cookies": cookies})
```

### Phase 5: Using Internal API Directly (after cookies are set)

Once you have a valid session, you can call internal APIs from the page context:

```python
result = page.evaluate("""
    async () => {
        const resp = await fetch('/nextjs-api/stream/create-evaluation', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                modality: 'image',
                mode: 'direct',
                modelIds: ['gpt-image-2-medium'],
                message: 'test prompt'
            })
        });
        return await resp.text();
    }
""")
```

### Phase 5b: Cookie-Based Auth Token Extraction (JWT from browser cookie)

When a platform stores auth tokens in cookies (e.g. Supabase JWT), extract them via **browser-side `atob()`** rather than Python's base64 module. This avoids Python version-specific base64 strictness issues (e.g., Python 3.14 rejects 1-mod-4 base64 lengths).

**Pattern — extract + decode in one browser evaluate call:**

```python
# Find the cookie via Playwright API (catches HTTP-only cookies too)
cookies = await context.cookies()
cookie_val = next(c['value'] for c in cookies if c['name'] == 'the-cookie-name')

# Decode in browser using atob() — handles any padding issue
js_code = """
(cookieVal) => {
    let b64 = cookieVal;
    // Remove any "base64-" prefix if present (some platforms add it)
    if (b64.startsWith('base64-')) b64 = b64.slice(7);
    while (b64.length % 4 !== 0) b64 += '=';  // atob() needs 0 mod 4
    try {
        const dec = atob(b64);
        const data = JSON.parse(dec);
        // Extract JWT from the decoded cookie payload
        const access_token = data.access_token;
        // Decode JWT payload for expiry info
        const parts = access_token.split('.');
        let jp = parts[1].replace(/-/g,'+').replace(/_/g,'/');
        while (jp.length % 4 !== 0) jp += '=';
        const jwt = JSON.parse(atob(jp));
        return {
            access_token: access_token,
            expires_at: jwt.exp,
            refresh_token: data.refresh_token
        };
    } catch(e) {
        return { error: e.message, length: b64.length, mod4: b64.length % 4 };
    }
}
"""
result = await page.evaluate(js_code, cookie_val)
# result['access_token'] is the JWT to use as Bearer token
```

**Key rules:**
1. Pass the cookie value as a Playwright **argument**, not embedded in the JS string (avoids encoding issues)
2. Use an **arrow function parameter** `(cookieVal) => {...}`, never `arguments[0]`
3. Always pad: `while (b64.length % 4 !== 0) b64 += '=';`
4. Use `context.cookies()` not `document.cookie` — the cookie may be HTTP-only

## Full Script Template

```python
#!/usr/bin/env python3
from playwright.sync_api import sync_playwright
import json, time, sys

URL = sys.argv[1] if len(sys.argv) > 1 else "https://target.com"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    )
    
    # Optional: load saved session
    # context = browser.new_context(storage_state="/tmp/session.json")
    
    page = context.new_page()
    
    # Monitor network responses
    page.on("response", lambda resp: print(f"[{resp.status}] {resp.url[:100]}"))
    
    try:
        page.goto(URL, timeout=30000, wait_until="networkidle")
        time.sleep(5)
        
        # Accept cookie banners if present
        try:
            accept = page.get_by_role("button", name="Accept")
            if accept.is_visible(timeout=2000):
                accept.click()
                time.sleep(2)
        except:
            pass
        
        # Save screenshot for debug
        page.screenshot(path='/tmp/debug.png')
        
        # Inspect page state
        has_challenge = "Security Verification" in page.inner_text('body')
        has_cf = "cf-browser-verification" in page.content()
        needs_login = "Log In" in page.inner_text('body') or "Sign In" in page.inner_text('body')
        
        print(f"Cloudflare: {'⚠️' if has_cf else '✅'}")
        print(f"reCAPTCHA: {'⚠️' if has_challenge else '✅'}")
        print(f"Login required: {'⚠️' if needs_login else '✅'}")
        
        # If reCAPTCHA present, need user to manually solve once
        if has_challenge:
            print("REQUIRES MANUAL INTERVENTION: reCAPTCHA cannot be automated")
            # Save session so far, user can resume after manual solve
            context.storage_state(path="/tmp/partial_session.json")
            
        # Try API call from page context
        result = page.evaluate("""
            async () => {
                try {
                    const resp = await fetch('/api/me');
                    return await resp.text();
                } catch(e) { return 'ERROR: ' + e.message; }
            }
        """)
        print(f"API /api/me: {result[:200]}")
        
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path='/tmp/error.png')
    finally:
        browser.close()
```

## Pitfalls

1. **Playwright vs Chromium browser sandbox** — The built-in Hermes browser tool is a lightweight sandbox that may time out on JS-heavy sites. Playwright is the proper tool for this, NOT `browser_navigate`. Check Playwright availability first.

2. **reCAPTCHA is a hard block** — No automation tool can solve Google reCAPTCHA. The only workaround is session cookie reuse from a manual solve. Plan for this from the start.

3. **Cloudflare fingerprints vary** — Some Cloudflare configurations are stricter than others. If `headless=True` fails, try `headless=False` or use Playwright's stealth mode (though not installed by default). The default UA string in the template usually works.

4. **Session cookies expire** — reCAPTCHA-verified sessions have limited lifetimes (typically hours). For long-running automation, schedule cookie refresh.

5. **Next.js API routes change** — Internal API endpoints like `/nextjs-api/stream/...` are not public contracts. They can change without notice when the site updates. Always check current JS bundles before relying on them.

6. **Rate limiting** — Internal APIs may have stricter rate limits than the public web interface. Don't hammer them.

7. **Page timing:** `wait_until="networkidle"` can hang on sites with persistent WebSocket connections (common in AI chat UIs). Use `"domcontentloaded"` instead and add a fixed `time.sleep()`.

8. **Browser context per session** — Don't reuse a single page for multiple different operations; close and reopen for clean state per task.

## Verification

```bash
# Quick check Playwright works
python3 -c "
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    print('Playwright OK, version:', b.version)
    b.close()
"
```
