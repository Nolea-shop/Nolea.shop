# Arena.ai Playwright Bridge Server

A persistent Playwright browser session wrapped in a Flask HTTP server. Performs UI automation (no API tokens).

## Architecture

```
n8n (WSL/Docker)
   └─ POST http://host.docker.internal:18765/generate  {prompt: "..."}
       └─ arena_playwright_bridge.py (Windows, port 18765)
           └─ Playwright Chromium (visible window, persistent profile)
               └─ arena.ai UI: type prompt → click generate → wait → download
```

## Setup

**File:** `C:\Users\Damia\.openclaw\scripts\arena_playwright_bridge.py`

```powershell
python C:\Users\Damia\.openclaw\scripts\arena_playwright_bridge.py
```

This opens a visible Chromium window on the desktop. **Do not close this window** — it is the automation session.

## First-Time Login

1. The browser opens arena.ai/image/direct
2. Click **"Log In"** (top-right)
3. Click **"Continue with Google"** in the modal
4. Complete Google SSO in the popup
5. The bridge detects login via `context.cookies()` checks every 3s

The profile persists cookies in `C:\Users\Damia\.openclaw\browser_profile\`. Do NOT kill Chrome processes between runs or the session is lost.

## API Endpoints

### `GET /health`

```json
{"status":"ok","logged_in":false,"last_image":null}
```

- `logged_in`: true if a non-anonymous `arena-auth-prod-v1` cookie is detected
- `last_image`: truncated URL of the most recently generated image

### `POST /health` → same as GET

### `POST /login`

Triggers the login waiter (clicks "Log In" then "Continue with Google" buttons). Returns immediately — check `/health` for `logged_in`.

### `POST /generate`

```json
// Request
{"prompt": "A cute cat pixel art"}

// On success → 200, image/png binary
// On error → 500, {"status":"error","message":"..."}
```

Returns the generated image as a **binary PNG** (mimetype `image/png`). Designed for n8n's HTTP Request node with `responseFormat: file`.

## n8n Workflow Config

```
HTTP Request Node:
  Method: POST
  URL: http://host.docker.internal:18765/generate
  Body: {"prompt": "={{ $json.prompt }}"}
  Options: responseFormat = file, outputFileName = arena_image.png

Telegram Node:
  Operation: sendPhoto
  Chat ID: <your_chat_id>
  Binary Property: data
```

## Pitfalls

1. **Do NOT kill Chrome/Chromium between bridge runs.** The persistent profile stores Supabase/arena auth cookies. Killing Chrome destroys the session and requires re-login.

2. **arena.ai blocks headless.** The browser must run in visible mode (`headless=False`). A minimized window on the desktop is fine — just do not close it.

3. **The login waiter polls every 3s.** After you log in, it takes up to 3s for the bridge to detect the session. Check `/health` for confirmation.

4. **Windows → WSL networking.** The bridge runs on `127.0.0.1` on Windows. From WSL2, reach it at the Windows host IP (from `/etc/resolv.conf` `nameserver` line) or `host.docker.internal` from Docker containers.

5. **Python 3.14.** The bridge uses Python's Flask and Playwright libraries installed in the Windows Python environment. Uses `threading` + `asyncio` to keep the Playwright and Flask runtimes separate.

## Files

- `C:\Users\Damia\.openclaw\scripts\arena_playwright_bridge.py` — the bridge server
- `C:\Users\Damia\.openclaw\browser_profile\` — persistent Playwright profile (keeps cookies/session)
- `C:\Users\Damia\.openclaw\scripts\fresh_token.json` — extracted JWT token (for debugging/reference)

## Related

See `references/arena-ai-api.md` for the legacy API-based approach (token extraction, cookie format, Supabase details).
