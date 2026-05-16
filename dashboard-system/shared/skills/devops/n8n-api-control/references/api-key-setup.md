# n8n API Key Setup

## Lokale n8n Instanz (D:\n8n)

**Zugangsdaten:**
- URL: http://localhost:5678
- Benutzer: admin@local.dev
- Passwort: Admin1234!

## API Key erstellen

1. n8n starten: `cd /mnt/d/n8n && docker compose up -d`
2. Browser öffnen: http://localhost:5678
3. Login mit obigen Zugangsdaten
4. Unten links auf **Settings** (Zahnrad) klicken
5. Links im Menü auf **API** klicken
6. **Create API Key** klicken
7. Namen vergeben (z.B. "hermes-agent") und kopieren

## Umgebungsvariable

Der API Key wird in `/mnt/d/n8n/.env` eingetragen:

```bash
N8N_API_KEY=dein-api-key-hier
```

## Docker Compose mit API Key

Aktualisierte docker-compose.yml um API Key:

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
    env_file:
      - .env
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=Admin1234!
      - N8N_HOST=localhost
      - N8N_PORT=5678
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - n8n-network
```

Dann mit `env_file` wird der API Key automatisch geladen.