# Arena.ai Playwright Automation Notes
## Interface Quirks
- Arena.ai uses a **chat interface**: After submitting a prompt, the URL changes to `/c/<UUID>` (e.g., `https://arena.ai/c/019de42d-7fd0-7fe2-8548-4e46f7b96879`)
- Images are rendered as chat messages, not page-level `<img>` tags — adjust selectors to target chat-rendered content

## Playwright Configuration Tips
1. **Avoid `executable_path`** in `launch_persistent_context` — use Playwright's built-in Chromium to avoid missing Chrome/Brave issues
2. **Persistent browser profile** retains login cookies across runs:
   ```python
   user_data_dir = os.path.join(os.path.expanduser("~"), ".openclaw", "browser_profile")
   context = await p.chromium.launch_persistent_context(user_data_dir, headless=headless)
   ```
3. **Headless mode warning**: Arena.ai may detect headless browsers — test visible mode first for initial login

## Debugging Timeouts
Add periodic checks during image generation wait loops:
```python
for i in range(120):
    await page.wait_for_timeout(1000)
    if i % 10 == 0 and i > 0:
        print(f"[arena] Still generating... ({i}s) - URL: {page.url}")
        imgs = await page.locator('img').count()
        print(f"[arena] Found {imgs} images on page")
        # Check for error text
        error_count = await page.locator('text=/error|failed|timeout/i').count()
        if error_count > 0:
            print("[arena] Error text detected on page!")
```

## Selector Priority
1. Prompt input: `textarea[placeholder*="image" i]`, `textarea[placeholder*="prompt" i]`
2. Generate button: `button[type="submit"]`, `button:has-text("Generate")`
3. Generated images: Target chat message containers first, then `<img>` tags within them

## Bridge Server Integration
- WSL2 bridge server forwards requests to Windows Playwright script via `cmd.exe /c`
- Ensure bridge returns clean JSON (no binary data) to avoid n8n HTTP Request node errors
- Use `text=False` + `decode(errors='replace')` for Windows subprocess output