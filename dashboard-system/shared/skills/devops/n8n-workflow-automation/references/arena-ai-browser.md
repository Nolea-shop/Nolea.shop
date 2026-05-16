# Arena.ai Browser Automation Reference

## Why Browser Over API
- Arena.ai API `/nextjs-api/stream/create-evaluation` requires Supabase JWT from cookie
- No public REST API — all `/api/v1/...` return 403
- Browser automation with persistent profile is the only reliable auth
- Token expires every 1h; refresh via Supabase API often fails (DNS unreachable)

## Cookie Extraction via Playwright + Browser atob()

This is the **approved pattern** for extracting the JWT from arena.ai's cookie.

### Prerequisites
- Playwright installed on Windows: `pip install playwright && playwright install chromium`
- Persistent profile directory: `C:\Users\Damia\.openclaw\browser_profile\`

### Pattern

```python
from playwright.async_api import async_playwright

async def extract_token():
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            r"C:\Users\Damia\.openclaw\browser_profile",
            headless=False,  # arena.ai blocks headless
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        page = context.pages[0] if context.pages else await context.new_page()
        
        await page.goto("https://arena.ai/image/direct")
        await page.wait_for_timeout(3000)
        
        # Check login — if no cookie, user must log in via visible browser
        cookies = await context.cookies()
        v1_val = None
        for c in cookies:
            if c['name'] in ('arena-auth-prod-v1', 'arena-auth-prod-v1.0'):
                v1_val = c['value']
        
        if not v1_val:
            # Wait for user to log in (visible window, up to 5 min)
            for i in range(300):
                await page.wait_for_timeout(1000)
                if i % 5 == 0:
                    cookies = await context.cookies()
                    for c in cookies:
                        if c['name'] in ('arena-auth-prod-v1', 'arena-auth-prod-v1.0'):
                            v1_val = c['value']
                            break
                    if v1_val: break
        
        # Decode via browser atob() — avoids Python 3.14 base64 strictness
        js = """
        (cookieVal) => {
            let b64 = cookieVal;
            while (b64.length % 4 !== 0) b64 += '=';
            const dec = atob(b64);
            const data = JSON.parse(dec);
            const jwt = data.access_token.split('.');
            let jp = jwt[1].replace(/-/g,'+').replace(/_/g,'/');
            while (jp.length % 4 !== 0) jp += '=';
            const j = JSON.parse(atob(jp));
            return { access_token: data.access_token, jwt_exp: j.exp, refresh_token: data.refresh_token };
        }
        """
        result = await page.evaluate(js, v1_val)
        return result['access_token']
```

### Key Rules

1. **Do NOT** embed the cookie value in the JS string — pass it as a Playwright argument to avoid encoding issues
2. **Do NOT** use `arguments[0]` in the JS — use an arrow function parameter like `(cookieVal) => {...}`
3. **Always add padding** before `atob()`: `while (b64.length % 4 !== 0) b64 += '=';`
4. **Use `context.cookies()`** (not `document.cookie`) — the cookie may be HTTP-only

### New Cookie Format (2026-05-15)

| Aspect | Value |
|---|---|
| Cookie name | `arena-auth-prod-v1` |
| Format | Raw base64 (no `base64-` prefix) |
| Length | ~1653 chars |
| User | Default: anonymous (`is_anonymous: true`) |

The old `arena-auth-prod-v1.0` (with `base64-` prefix, 3180 chars) is **deprecated/expired**. If you encounter it, the session is stale.

### Login Detection

Check for the cookie name in `context.cookies()`:
```python
has_auth = any(c['name'] in ('arena-auth-prod-v1', 'arena-auth-prod-v1.0') for c in cookies)
```

The page itself may render without redirecting to login — arena.ai shows the UI even for anonymous users. Don't rely on URL redirection to detect login state.

### Login Modal Interaction

When logged out, the visible browser shows arena.ai with a **"Log In" button** (top-right). Clicking it opens a modal with:

- Title: "Log In or Create Account"
- Google button: "Continue with Google"
- Email fallback: "Continue with email"

**Automation sequence:**
1. Page loads → `await page.locator('button:has-text("Log In")').click()`
2. Wait for modal → `await page.locator('button:has-text("Continue with Google")').click()`
3. Google popup appears (Google cookies persisted from profile → account picker)
4. User selects account → Google auth completes → `arena-auth-prod-v1` cookie appears
5. Monitor `context.cookies()` every 3-5s until cookie detected

### Session Persistence

**CRITICAL: Do NOT kill Chrome processes between extractions.** Running `taskkill /F /IM chrome.exe` clears the persistent profile's session cookies. The user must re-login via Google SSO afterwards.

Instead:
- Keep the Playwright bridge server running continuously
- If restart is needed, close the browser gracefully via Playwright's API (`context.close()`)
- The profile directory persists cookies across graceful restarts
- Chrome kills (e.g., from taskkill before relaunch) may still lose HTTP-only session cookies even with persistent profiles

### Anonymous Sessions

New persistent profiles default to anonymous login. The JWT looks like:
```json
{"email": "", "is_anonymous": true}
```

If the API rejects anonymous tokens for image generation, the user must explicitly log in via Google SSO in the browser window.

## Persistent Profile Setup

- **Location**: `C:\Users\Damia\.openclaw\browser_profile\`
- Playwright's `launch_persistent_context()` manages the profile automatically
- **Do NOT kill Chrome processes** between extractions — this clears session cookies!
- To preserve login across sessions, keep the profile and avoid `taskkill /F /IM chrome.exe`

## Bridge Server Pattern (WSL2 → Windows)

```python
# arena_bridge_server_wsl.py runs on WSL2
cmd = f'cmd.exe /c "python {SCRIPT} {escaped_prompt}"'
```

**Endpoint**: `POST http://<windows-ip>:18765/generate`
- Body: `{"prompt": "..."}`
- Returns JSON or binary PNG

**Windows IP**: Get from `/etc/resolv.conf` (`nameserver` line)

## Debugging Tips

- `await page.screenshot(path="debug.png")` on timeout/error
- Check cookie count with `len(await context.cookies())`
- All arena.ai scripts at `C:\Users\Damia\.openclaw\scripts\arena_*.py`
- `fresh_token.json` = the extracted JWT for bridge server use
