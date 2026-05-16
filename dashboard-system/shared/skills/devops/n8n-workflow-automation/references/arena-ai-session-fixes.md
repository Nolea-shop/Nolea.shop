# Arena.ai Session Fixes (2026-05-01)

## Critical Fixes From This Session

### 1. Headless Mode Blocked
Arena.ai consistently blocks headless Playwright. **Do NOT use `--headless` flag** — run in visible mode (remove `--headless` from command line and script parameters).

### 2. Image Selector
Arena.ai uses Cloudflare R2 storage for generated images. Primary selector:
```python
img_selector = 'img[src*="cloudflarestorage.com"]'
await img.wait_for(state="visible", timeout=120000)
```

### 3. Bridge Server Encoding Fix
Windows command output may contain non-UTF-8 bytes (e.g., 0x81). Fix in bridge server:
```python
result = subprocess.run(
    cmd, shell=True,
    capture_output=True, text=False, timeout=300
)
output = result.stdout.decode('utf-8', errors='replace').strip() if result.stdout else ""
stderr_output = result.stderr.decode('utf-8', errors='replace').strip() if result.stderr else ""
```

### 4. n8n Workflow Structure (Image → Telegram)
HTTP Request node returns JSON with `image_path_wsl` (file path), not binary data. Add these nodes:
```
Manual Trigger → Code (prompt) → HTTP Request (bridge /generate)
→ Parse Result → IF (success?) → Read File (load image_path_wsl)
→ Telegram (sendPhoto) / Telegram (error)
```

### 5. Bridge Server Command Line
Remove `--headless` from bridge server's command to Windows:
```python
# No --headless: arena.ai blocks headless
cmd = f'cmd.exe /c "python {GENERATE_SCRIPT} {escaped_prompt}"'
```

### 6. n8n Execution Pitfall
Manual execution returns `Cannot read properties of undefined (reading 'nodeName')` if workflow nodes are not correctly connected. Ensure `connections` object in workflow JSON uses node `name` (not `id`) as keys.

### 7. Playwright Script Fix
Remove `executable_path` from `launch_persistent_context` — use Playwright's built-in Chromium to avoid missing Chrome/Brave issues:
```python
context = await p.chromium.launch_persistent_context(
    user_data_dir,
    headless=headless,  # False for arena.ai
    # No executable_path — use Playwright's Chromium
    viewport={"width": 1280, "height": 900},
    locale="en-US",
    args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
)
```