# Arena.ai Image Generator n8n Workflow Reference
## Workflow Structure (Manual Trigger Example)
- **Trigger**: Manual Trigger Node
- **Code Node**: Generate 4 styles × 7 motives × 7 quotes prompts
- **Execute Command Node**: Call WSL bridge server `http://127.0.0.1:18765/generate` with prompt
- **Code Node**: Parse JSON result from bridge
- **IF Node**: Check success flag
- **Telegram Node**: Send image (success) or error message (failure)

## Bridge Server Setup (WSL to Windows)
1. Save bridge script to `/home/damia/arena_bridge_server_wsl.py`
2. Start in background: `python3 /home/damia/arena_bridge_server_wsl.py &`
3. Verify: `curl http://127.0.0.1:18765/health`

## Windows Script Requirements
- Script: `C:\Users\Damia\.openclaw\scripts\arena_generate.py`
- Requires `--headless` flag for WSL execution
- Uses Playwright Chromium with persistent profile for arena.ai login retention
- Telegram Credentials: Bot Token `[REDACTED]`, Chat ID `8560792980`

## Activation Steps
1. Create workflow via POST `/rest/workflows`
2. Get `versionId` via GET `/rest/workflows/{id}`
3. Activate via PUT `/rest/workflows/{id}` with `active: true` and `versionId`
