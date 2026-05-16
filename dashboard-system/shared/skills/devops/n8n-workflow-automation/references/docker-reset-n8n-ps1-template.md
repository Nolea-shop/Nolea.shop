# Docker n8n Reset PowerShell Script Template

## Purpose
When `.env` credentials stop working with "Wrong username or password", use this script to fully reset the Docker container.

## Template: RESET-N8N.PS1

```powershell
# RESET-N8N.PS1 - Komplettes n8n Zurücksetzen
# Rechtsklick -> "Mit PowerShell als Administrator ausführen"

Write-Host "=== n8n Passwort-Reset ===" -ForegroundColor Cyan

# 1. Alle n8n-Prozesse beenden
Write-Host "1. Beende n8n Prozesse..." -ForegroundColor Yellow
Stop-Process -Name "n8n" -ErrorAction SilentlyContinue
Stop-Process -Name "node" -ErrorAction SilentlyContinue
docker ps -q --filter "ancestor=n8nio/n8n" | ForEach-Object { docker stop $_ } 2>$null

# 2. Docker-Container neu starten (liest .env neu)
Write-Host "2. Starte Docker n8n neu..." -ForegroundColor Yellow
cd "D:\n8n"
docker-compose down
docker-compose up -d

# 3. Kurz warten
Start-Sleep -Seconds 5

# 4. Status prüfen
Write-Host "`n3. Container Status:" -ForegroundColor Cyan
docker ps --filter "name=n8n" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`n=== Fertig ===" -ForegroundColor Green
Write-Host "Login: http://localhost:5678" -ForegroundColor White
Write-Host "Benutzer: admin" -ForegroundColor White
Write-Host "Passwort: Admin1234!" -ForegroundColor White
```

## When Credentials Work Again

After reset, verify with:
1. Open http://localhost:5678
2. Login with credentials from `.env`: `N8N_BASIC_AUTH_USER` and `N8N_BASIC_AUTH_PASSWORD`

## Common .env Values

```bash
# n8n Environment Configuration
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=Admin1234!
```