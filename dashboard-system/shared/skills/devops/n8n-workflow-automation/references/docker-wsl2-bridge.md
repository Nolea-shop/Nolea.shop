# Docker + Bridge Server Setup for n8n on WSL2/D:\ Drive

## Problem
When n8n runs in Docker on D:\ drive but needs to execute Windows Playwright scripts, the Execute Command node fails because Windows paths (C:\Users\...) are not accessible from within the Docker container.

## Solution: Bridge Server Pattern

### 1. Docker Compose Configuration

```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n-herzstueck
    restart: unless-stopped
    ports:
      - "5678:5678"
    volumes:
      - ./n8n-data:/home/node/.n8n
      - /mnt/c/Users/Damia/.openclaw:/openclaw:ro
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=Admin1234!
      - N8N_HOST=localhost
      - N8N_PORT=5678

  bridge-server:
    build: ./bridge-server
    container_name: n8n-bridge
    restart: unless-stopped
    ports:
      - "18765:18765"
    volumes:
      - /mnt/c/Users/Damia/.openclaw:/openclaw:ro
      - /mnt/c/Users/Damia/.openclaw/media:/media
    environment:
      - PLAYWRIGHT_SCRIPT=/openclaw/scripts/arena_generate.py
```

### 2. Bridge Server (Flask)

```python
# bridge-server/server.py
from flask import Flask, request, send_file
import subprocess
import json
import os

app = Flask(__name__)
SCRIPT_PATH = os.environ.get('PLAYWRIGHT_SCRIPT', '/openclaw/scripts/arena_generate.py')

@app.route('/generate', methods=['POST'])
def generate():
    data = request.get_json() or {}
    prompt = data.get('prompt', '')
    
    cmd = ['python', SCRIPT_PATH, prompt]
    result = subprocess.run(cmd, capture_output=True, text=False, timeout=120)
    
    try:
        output = json.loads(result.stdout)
        if output.get('status') == 'ok' and output.get('image_path'):
            wsl_path = windows_to_wsl_path(output['image_path'])
            if os.path.exists(wsl_path):
                return send_file(wsl_path, mimetype='image/png')
    except:
        pass
    
    return {'status': 'error', 'message': 'Failed'}, 500

def windows_to_wsl_path(win_path):
    return win_path.replace('C:\\', '/mnt/c/').replace('\\', '/')
```

### 3. Workflow Adaptation

Replace Execute Command node with HTTP Request:

**HTTP Request Node config:**
```json
{
  "method": "POST",
  "url": "http://bridge-server:18765/generate",
  "sendBody": true,
  "body": "={\n  \"prompt\": \"{{ $json.prompt }}\",\n  \"headless\": true\n}",
  "options": {
    "response": {
      "responseFormat": "file"
    }
  }
}
```

**Key insight**: Bridge server returns PNG file directly (Flask send_file), avoiding the base64->binary conversion issues that cause Telegram 400 "no photo in request" errors.

### 4. Telegram Node Configuration

```json
{
  "operation": "sendPhoto",
  "chatId": "8560792980",
  "binaryPropertyName": "data"
}
```

### 5. Docker Commands

```bash
cd /mnt/d/n8n
docker compose up -d
docker compose logs -f
docker compose down
```

## Lessons Learned (2026-05-02)

1. **Execute Command node doesn't work across Windows/WSL2 boundaries** - always use bridge server pattern
2. **File return is more reliable than base64 JSON** for image handling in n8n/Telegram
3. **Mount Windows paths via /mnt/c/ not native Windows paths** for Docker volume mounts
4. **Use hostname 'bridge-server' inside Docker network**, not 'localhost'