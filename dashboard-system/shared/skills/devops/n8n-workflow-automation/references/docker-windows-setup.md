# Docker n8n Setup für Windows mit D:\ Laufwerk

## Schnellstart-Skript

```batch
@echo off
title Arena Image Generator System

REM Part 1: Bridge Server (Windows)
echo [1] Starte Arena Bridge Server...
cd /d "C:\Users\Damia\.openclaw\scripts"
start "" python arena_bridge_server_win.py --use-localhost
timeout /t 2 /nobreak >nul

REM Part 2: n8n starten
echo [2] Starte n8n...
cd /d "D:\n8n"
start "" powershell -NoExit -Command "npx n8n"

echo.
echo n8n: http://localhost:5678
echo Login: admin / Admin1234!
echo Bridge: http://localhost:18765
pause
```

## Docker-Compose.yml

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
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=Admin1234!
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - n8n-network

networks:
  n8n-network:
    driver: bridge
```

## Bridge Server (Windows)

Starte den Bridge Server zuerst, bevor du n8n startest:

```powershell
cd "C:\Users\Damia\.openclaw\scripts"
python arena_bridge_server_win.py --use-localhost
```

Der `--use-localhost` Parameter bindet an 127.0.0.1, damit Docker über `host.docker.internal` erreichen kann.

## Workflow URL für Docker

Im Workflow den HTTP Request Node so konfigurieren:

```json
{
  "method": "POST",
  "url": "http://host.docker.internal:18765/generate",
  "sendBody": true,
  "body": "{\n  \"prompt\": \"{{ $json.prompt }}\",\n  \"headless\": true\n}"
}
```