# Arena.ai Image Generation Automation

## Current Working Architecture (2026-05-01)

```
n8n Schedule Trigger → Code (prompt gen) → HTTP Request (bridge server) → Telegram sendPhoto
```

- **Bridge server**: `/home/damia/arena_bridge_server_wsl.py` (Flask on WSL port 18765)
- **Playwright script**: `C:\Users\Damia\.openclaw\scripts\arena_generate.py` (Windows)
- **Bridge server calls Windows Python via**: `cmd.exe /c "python C:\\...\\arena_generate.py ..."`
- **Bridge returns**: `Content-Type: image/png` with binary PNG via Flask `send_file()`
- **n8n HTTP Request**: `responseFormat: file` — receives PNG binary directly
- **Telegram**: `binaryPropertyName: data` — sends image without Code node conversion

**Workflow ID**: `sSKDlOMwSiC6Zt0A` (Arena Image Generator Daily), schedule daily 20:00.

## Auth

- Arena.ai uses Google SSO → Supabase JWT
- Key cookie: `arena-auth-prod-v1.1` (base64-encoded JSON with `access_token`, `refresh_token`, `user`)
- `access_token` is a Supabase JWT: `iss = https://<project>.supabase.co/auth/v1`
- `arena-auth-prod-v1.0` contains the same (shorter base64)
- Other cookies: `__cf_bm` (Cloudflare), `_ga_*` (Google Analytics), `cf_clearance` (CF challenge)

## Playwright Script Pattern

Use `launch_persistent_context()` to retain login across runs:

```python
context = await p.chromium.launch_persistent_context(
    user_data_dir,           # persists cookies/localStorage between runs
    headless=False,          # visible browser for login; can switch to True after
    executable_path=CHROME_PATH,
    viewport={"width": 1280, "height": 900},
    locale="en-US",
    args=["--disable-blink-features=AutomationControlled"],
)
```

**First run:** Script opens Chrome visible → user logs in to arena.ai → session saved to `user_data_dir`.
**Subsequent runs:** Script reuses saved session, no login needed.

## Bridge Server Debugging (Critical)

When Telegram reports "no photo in request" but n8n workflow config is correct:
1. Check if bridge server is returning PNG or JSON:
   ```bash
   curl -v -X POST http://127.0.0.1:18765/generate \
     -H "Content-Type: application/json" \
     -d '{"prompt":"a serene mountain lake at dawn"}' \
     --max-time 90 -o /tmp/test.png

   file /tmp/test.png
   # Expected: PNG image data
   # If JSON/ASCII: bridge server has a bug — it's returning JSON, not the image
   ```
2. Look for Python syntax errors in the Flask route handler that prevent `send_file()` from being reached:
   - Orphan `else:` block after an `except` block (causes `SyntaxError` at call time)
   - Duplicate `except Exception` handlers (only last one fires)
   - Any `return` in the exception handler path that prevents `send_file()` from executing
3. The bridge server **must** return `Content-Type: image/png` in the HTTP response headers.

## Generated Script Location

`C:\\Users\\<user>\\.openclaw\\scripts\\arena_generate.py`

**Usage:**
```bash
cmd.exe /c "python C:\\Users\\<user>\\.openclaw\\scripts\\arena_generate.py \"A lone wolf standing in the snow...\""
```

**Output (stdout):**
```json
{"status": "ok", "image_path": "C:\\Users\\<user>\\.openclaw\\media\\arena_20260501_120000.png", "model": "gpt-image-2", "size": "medium", "prompt": "..."}
```
or on error:
```json
{"status": "error", "message": "...", "debug_screenshot": "C:\\Users\\<user>\\.openclaw\\media\\arena_debug_....png"}
```

## Download directory

`C:\\Users\\<user>\\.openclaw\\media\\`
