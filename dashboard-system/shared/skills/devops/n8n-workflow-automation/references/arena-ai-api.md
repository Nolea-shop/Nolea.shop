# Arena.ai Direct API — Reverse Engineered

## Key Endpoint

```
POST https://arena.ai/nextjs-api/stream/create-evaluation
Content-Type: text/plain;charset=UTF-8
```

This is a **streaming** endpoint (SSE/EventStream). The response contains image URLs as they're generated.

## Cookie Extraction — The Reliable Pattern (2026-05-15+)

Arena.ai stores auth in the **`arena-auth-prod-v1`** cookie (raw base64, no prefix, ~1653 chars). **Do NOT** decode this with Python's base64 module on Python 3.14+ (rejects 1-mod-4 lengths). Use **browser-side `atob()`** via Playwright:

```python
# 1. Get cookie via Playwright API (catches all cookies including HTTP-only)
cookies = await context.cookies()
v1_val = next(c['value'] for c in cookies if c['name'] == 'arena-auth-prod-v1')

# 2. Decode in browser - atob() handles padding correctly
js_code = """
(cookieVal) => {
    let b64 = cookieVal;
    while (b64.length % 4 !== 0) b64 += '=';
    const dec = atob(b64);
    const data = JSON.parse(dec);
    const jwt = data.access_token.split('.');
    let jp = jwt[1].replace(/-/g,'+').replace(/_/g,'/');
    while (jp.length % 4 !== 0) jp += '=';
    const j = JSON.parse(atob(jp));
    return { access_token: data.access_token, jwt_exp: j.exp, email: j.email };
}
"""
result = await page.evaluate(js_code, v1_val)  # Pass as arg, NOT embed in string
access_token = result['access_token']
```

**Key rules:**
- Use `context.cookies()` not `document.cookie` (the auth cookie is found by Playwright but may not appear in `document.cookie`)
- Pass cookie as Playwright argument — never embed in JS template literal
- Use arrow function parameters (`(val) => ...`), NOT `arguments[0]`
- `atob()` needs length % 4 === 0 — add `=` padding first

### Login Detection

```python
cookies = await context.cookies()
has_auth = any(c['name'] == 'arena-auth-prod-v1' for c in cookies)
```

The page may render without redirecting even when logged out — don't rely on URL checks alone.

### Google SSO Login Flow

If no `arena-auth-prod-v1` cookie exists:
1. Open `https://arena.ai/image/direct` in visible browser
2. Click **"Log In"** button (top-right corner)
3. Modal appears with **"Continue with Google"** button
4. User must click it and complete Google SSO in the popup
5. Monitor `context.cookies()` for `arena-auth-prod-v1` to appear
6. Save the extracted token to `fresh_token.json`

## Request Body Structure

```json
{
  "id": "<session-uuid>",
  "mode": "direct-battle",
  "modelAId": "<model-uuid>",
  "userMessageId": "<uuid>",
  "modelAMessageId": "<uuid>",
  "userMessage": {
    "content": "<prompt text>",
    "experimental_attachments": [],
    "metadata": {}
  },
  "modality": "image",
  "recaptchaV3Token": ""
}
```

## Known Model IDs

| Model | ID |
|---|---|
| gpt-image-2 | `019db344-75b0-7acd-aa20-bcc095ca0ed9` |

## Authentication (2026-05-15 Update)

Arena.ai changed their auth system. Current state:

| Aspect | Old (May 1) | New (May 15) |
|---|---|---|
| Cookie name | `arena-auth-prod-v1.0` | `arena-auth-prod-v1` |
| Prefix | `base64-` prefix | **No prefix** — raw base64 |
| Length | ~3180 chars (3173 b64) | ~1653 chars |
| User | `babyprobo.09@gmail.com` | Can be **anonymous** (`is_anonymous: true`, `email: ""`) |
| Supabase project | `https://hogzoeqzcrdvkwtvodi.supabase.co` | Same (but DNS often unreachable from WSL/Windows) |

The cookie value is **raw base64-encoded JSON** (no `base64-` prefix anymore). Decoded structure:

```json
{
  "access_token": "eyJ...JWT...",
  "token_type": "bearer",
  "expires_in": 3600,
  "expires_at": 1778843480,
  "refresh_token": "stpmqmkzbz3l",
  "user": { "id": "...", "aud": "authenticated", "role": "authenticated" }
}
```

The `access_token` is a Supabase JWT (ES256):
- `iss`: `https://huogzoeqzcrdvkwtvodi.supabase.co/auth/v1`
- `sub`: user UUID
- `exp`: ~1h from issuance
- `is_anonymous`: true for visitors who didn't Google SSO

### Token Lifetime & Refresh

- Token expires **every 1 hour** (3600s)
- Refresh token included in cookie payload
- **Supabase refresh endpoint often unreachable** (DNS: `huogzoeqzcrdvkwtvodi.supabase.co` fails from both WSL and Windows)
- Only reliable refresh: Playwright → browser login → re-extract

## Cookie Extraction — The Reliable Pattern

**Do NOT** rely on `context.cookies()` alone — the raw cookie value can be 1 mod 4 length which Python 3.14's base64 module rejects. Use **browser-side `atob()`** via Playwright's `page.evaluate()`:

```python
# 1. Extract cookie via Playwright API (gets ALL cookies including HTTP-only)
cookies = await context.cookies()
v1_val = next(c['value'] for c in cookies if c['name'] == 'arena-auth-prod-v1')

# 2. Decode using atob() in browser — handles padding correctly
js_code = """
(cookieVal) => {
    const b64 = cookieVal;
    let p = b64;
    while (p.length % 4 !== 0) p += '=';  // atob() needs 0 mod 4
    try {
        const dec = atob(p);
        const data = JSON.parse(dec);
        const jwt = data.access_token.split('.');
        let j = {};
        if (jwt.length === 3) {
            let jp = jwt[1].replace(/-/g,'+').replace(/_/g,'/');
            while (jp.length % 4 !== 0) jp += '=';
            j = JSON.parse(atob(jp));
        }
        return { success: true, access_token: data.access_token, jwt_exp: j.exp };
    } catch(e) {
        return { error: e.message, b64_len: b64.length, b64_mod4: b64.length % 4 };
    }
}
"""
result = await page.evaluate(js_code, v1_val)
access_token = result['access_token']
```

**Key:** Pass the cookie value as a Playwright argument (not embedded in JS string). Playwright serializes it correctly. Do NOT use `arguments[0]` in the JS — use an arrow function parameter.

### Login Detection Flow

```python
# After opening arena.ai page:
page.goto("https://arena.ai/image/direct")
cookies = await context.cookies()
has_auth = any(c['name'] in ('arena-auth-prod-v1.0','arena-auth-prod-v1') for c in cookies)

if not has_auth:
    # User must click "Continue with Google" in visible browser
    for i in range(300):
        await page.wait_for_timeout(1000)
        if i % 5 == 0:
            cookies = await context.cookies()
            if any(c['name'] in ('arena-auth-prod-v1.0','arena-auth-prod-v1') for c in cookies):
                break  # Login detected
```

## Cookie-Based API Call (From Browser)

The most reliable way to call the API is from the browser context itself (cookies auto-included):

```javascript
const resp = await fetch("https://arena.ai/nextjs-api/stream/create-evaluation", {
    method: "POST",
    headers: {"content-type": "text/plain;charset=UTF-8"},
    body: JSON.stringify(payload)
});
```

This works even for HTTP-only cookies. The downside: you need the Playwright browser to stay open during generation.

## Playwright Bridge Server (Recommended Primary Approach)

Since arena.ai's API auth is unreliable (anonymous tokens rejected, Supabase refresh DNS dead), the **Playwright bridge server** at `C:\\Users\\Damia\\.openclaw\\scripts\\arena_playwright_bridge.py` is the recommended approach:

- Hält eine dauerhafte Playwright-Browser-Session (sichtbar, logged in)
- Kein Token-Gefiddel — der Browser managed Auth automatisch
- `POST /generate {prompt}` → full UI automation → PNG zurück
- Siehe Skill `arena-ai-playwright-bridge` für Details

## Login Modal Details

When the user clicks "Log In" on arena.ai, a modal appears with:

```
Log In or Create Account
Your current chat history will be saved to your new account...

[ Continue with Google ]     ← THIS BUTTON
OR
[ Continue with email ]      ← Alternative: email input
```

The page renders even when **not** logged in (provisional state). Don't rely on URL redirects for login detection.

## Anonymous Session Detection

Playwright persistent profiles can create anonymous sessions. Check the cookie payload:
```json
{"amr": [{"method": "anonymous", ...}], "is_anonymous": true, "email": ""}
```

If `is_anonymous: true`, the API returns `{"error":"Login required","code":"LOGIN_GATE"}`. User must log in via Google SSO.

## Pitfalls

1. **Python 3.14 base64 strictness**: Python 3.14's `base64.b64decode()` rejects strings with length 1 mod 4 (even with padding). Always use browser-side `atob()` for decoding. See [2026-05-15: arena.ai auth upgrade](#2026-05-15-session-arenaai-auth-upgrade).

2. **Supabase DNS unreachable**: The Supabase project at `huogzoeqzcrdvkwtvodi.supabase.co` cannot be resolved from both WSL and Windows. Token refresh via Supabase API fails. Only Playwright re-login works.

3. **Anon vs Google session**: New arena.ai sessions default to anonymous. Fresh Playwright persistent profiles may not trigger Google SSO. The user must explicitly log in via the visible browser window.

4. **No public REST API**: All `/api/v1/...` endpoints return 403. Only `/nextjs-api/stream/create-evaluation` works (NextJS internal, needs session cookies).

5. **SSE response parsing**: Response is SSE format. Each line is `data: {...}` or raw JSON. Parse each line for `imageUrl`, `image_url`, or `url` fields.

---

## 2026-05-15 Session — Arena.ai Auth Upgrade

### What Changed

Arena.ai silently migrated their auth cookie:

| Before (May 1) | After (May 15) |
|---|---|
| `arena-auth-prod-v1.0 = base64-<3180chars>` | `arena-auth-prod-v1 = <1653chars>` |
| Always Google SSO (`babyprobo.09@gmail.com`) | Defaults to **anonymous** (`is_anonymous: true`) |
| `base64-` prefix present | No prefix — just raw base64 |
| 3173 b64 chars (1 mod 4 — invalid!) | 1653 b64 chars (mod 4 = 1, but atob works) |

The old `arena-auth-prod-v1.0` cookie (with `base64-` prefix and 3180 chars) is **gone**. If you see a 3180-char cookie, it's stale/expired and cannot be decoded — the user needs to re-login.

### Anonymous Users

New arena.ai sessions default to anonymous auth. The JWT shows:
```json
{
  "email": "",
  "is_anonymous": true,
  "amr": [{"method": "anonymous", "timestamp": ...}]
}
```

This may or may not have access to GPT-Image-2. If API calls return 401/403, the user needs to log in via Google SSO instead.

### Python 3.14 Base64 Workaround

Python 3.14's base64 module is stricter than previous versions. Even with correct padding, a 1-mod-4 base64 length is rejected:
```
Invalid base64-encoded string: number of data characters (3173) cannot be 1 more than a multiple of 4
```

**Fix**: Do NOT try to decode base64 cookies in Python. Use browser-side `atob()` via Playwright's `page.evaluate()`. The browser's `atob()` handles padding automatically when you add `=` to make length 0 mod 4.

### Scripts Created This Session

All at `C:\Users\Damia\.openclaw\scripts\`:

| Script | Purpose |
|---|---|
| `arena_token_manager.py` | Full extraction w/ Playwright (v1) |
| `arena_extractor_v2.py` | v2 with cookie save-to-file |
| `arena_extractor_v3.py` | v3 with browser atob() |
| `arena_extractor_v4.py` | v4 browser-side API call |
| `arena_login_extractor_v5.py` | v5 login+extract, waits for user |
| `arena_final_extractor_v7.py` | v7 — final working version |
| `arena_v7_fix.py` | Fix for v7 (correct param passing) |
| `deep_analysis.py` | Cookie content analysis |
| `debug_b64.py`, `debug_b64_v2.py` | Python 3.14 base64 debugging |
| `standalone_decode.py` | Standalone b64 decoder |

**Working version**: `arena_v7_fix.py` — extracts fresh cookie + decodes via atob() in browser → saves to `fresh_token.json`.
