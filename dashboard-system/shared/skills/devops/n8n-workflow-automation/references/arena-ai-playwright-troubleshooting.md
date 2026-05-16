# WSL2 Playwright + Chrome Profile Troubleshooting

## Arena.ai Specific Issues

### Error: `API returned 401: {"message":"User not found"}`
**Cause**: The arena-auth-prod-v1.0 cookie (3180 chars) cannot be decoded as base64 JSON and raw value is expired.

**Solution**: Must authenticate via visible browser first.
- Cookie appears valid length but base64 decode fails: `'utf-8' codec can't decode byte 0xab in position 1`
- Raw cookie value doesn't work as Bearer token
- Arena.ai requires freshly extracted token from active session

### Error: Browser Not Visible in Background
**Cause**: WSL2 background terminals can't display GUI applications.

**Symptoms**:
- Script runs but no Chrome window opens
- Script fails with 401 after timeout
- No visible login prompt

**Solution**: Use foreground terminal OR test Chrome visibility first:
```bash
# Test Chrome visibility in WSL2
google-chrome --user-data-dir="/mnt/c/Users/Damia/.openclaw/browser_profile" "https://arena.ai"
```

If Chrome doesn't appear, WSL2 desktop integration is not configured.

### Chrome Profile Path
- Windows: `C:\Users\Damia\.openclaw\browser_profile`
- WSL2: `/mnt/c/Users/Damia/.openclaw/browser_profile`
- Must be created by manual login first

## PowerShell Background Terminal Gotcha

### Working Pattern:
```bash
# This works in background terminal
powershell.exe -File "C:\scripts\run.ps1" 2>&1
```

### Problematic Pattern:
```bash
# This may silently fail in background
powershell.exe -Command "cd 'C:\scripts'; python arena_generate.py 'test'" &
```

The background terminal doesn't capture PowerShell's stdout/stderr correctly, leading to silent failures and no visible browser.

## Test Sequence

1. **Verify Chrome profile exists**:
   ```bash
   ls -la "/mnt/c/Users/Damia/.openclaw/browser_profile/Default/" | head -5
   ```

2. **Manual login test**:
   - Open Chrome with profile on Windows
   - Log into arena.ai manually
   - Close Chrome

3. **Playwright test**:
   ```powershell
   # Run in FOREGROUND terminal on Windows
   python arena_generate.py "test prompt"
   ```

4. **n8n integration**:
   - Only after manual test succeeds
   - Use bridge server pattern