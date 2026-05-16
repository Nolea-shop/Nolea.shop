# Docker Setup for n8n on Windows D:\ Drive

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Windows 11                                      │
│  ├── Docker Desktop                             │
│  │   └── n8n Container (Port 5678)             │
│  │       └── HTTP Request → host.docker.internal │
│  │           ↓                                 │
│  └── Python Bridge-Server (Port 18765)         │
│      └── Runs arena_generate.py with Playwright │
│          on Windows with Chrome profile         │
└─────────────────────────────────────────────────┘
```

## Files Created (D:\n8n\)

### docker-compose.yml
```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n-herzstueck
    ports:
      - "5678:5678"
    volumes:
      - ./n8n-data:/home/node/.n8n
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=Admin1234!
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

### Workflow Change (HTTP Request Node)
```json
{
  "method": "POST",
  "url": "http://host.docker.internal:18765/generate",
  "responseFormat": "file"
}
```

## Windows Bridge Server

Uses existing `arena_bridge_server_win.py` with `--use-localhost` flag:

```powershell
python arena_bridge_server_win.py --use-localhost
```

This binds to `127.0.0.1` instead of `0.0.0.0`, enabling `host.docker.internal` to reach it.

## Startup Script

`D:\n8n\Start-n8n-Docker.ps1`:
```powershell
# Start Bridge Server
Start-Process python -Argument "C:\Users\Damia\.openclaw\scripts\arena_bridge_server_win.py --use-localhost" -WindowStyle Hidden

# Start Docker
cd "D:\n8n"
docker compose up -d
```

## Key Points

1. **Docker Desktop required** - Docker must be installed on Windows
2. **Bridge server runs on Windows** - NOT in Docker container
3. **host.docker.internal** - Special DNS name Docker Desktop provides for the Windows host
4. **--use-localhost flag** - Bridge server binds to 127.0.0.1 for Docker accessibility