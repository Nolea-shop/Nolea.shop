# Multi-Agent Dashboard — Verbindungsplan für NAME (Julian's Hermes)

## Übersicht

Auf **Damians PC (Suffix/WSL)** läuft ein Multi-Agent Dashboard auf Port **8383**.
Julian's Hermes (NAME) soll sich via Tailscale mit dem Dashboard verbinden können,
um API-Daten abzurufen und ggf. Commands zu senden.

---

## 1. Voraussetzungen auf NAME (Julian's Server)

### Tailscale installieren
```bash
curl -fsSL https://tailscale.com/install.sh | sh
# Oder auf Windows: https://tailscale.com/download
```

### Tailscale einrichten
```bash
sudo tailscale up
# Bei Browser-Login anmelden mit:
# - Account: babyprobo.09@gmail.com (gleicher Tailscale-Account!)
```
Wichtig: **BEIDE Systeme müssen im SELBEN Tailscale-Account sein.**

Sobald verbunden: Julian findet Damian's PC unter dem Namen `suffix` oder der IP `100.103.196.11`.

---

## 2. Dashboard API Endpoints (via Tailscale)

Dashboard läuft auf Damian's PC unter Port 8383, erreichbar über:

**Basis-URL:** `http://100.103.196.11:8383`

### Webseiten
| Path | Beschreibung |
|------|-------------|
| `http://100.103.196.11:8383/` | Haupt-Dashboard (Apple Design) |
| `http://100.103.196.11:8383/tokens` | Token-Analytics mit Charts |
| `http://100.103.196.11:8383/activity` | Aktivitäts-Feed |
| `http://100.103.196.11:8383/health` | System-Health |
| `http://100.103.196.11:8383/tasks` | Task-Queue |
| `http://100.103.196.11:8383/calendar` | Content-Kalender |
| `http://100.103.196.11:8383/pipeline` | Nolea Pipeline |
| `http://100.103.196.11:8383/diary` | Tagebuch (Live-Diary) |

### REST APIs (JSON)
| Path | Beschreibung |
|------|-------------|
| `/api/status` | Gesamtstatus (Host, Tailscale, Tokens, Prozesse) |
| `/api/tokens` | OpenRouter + Nous Usage |
| `/api/sub-agents` | Alle Sub-Agents mit Status |
| `/api/activity` | Letzte Aktivitäten |
| `/api/health` | System-Health (RAM, CPU, Disk, uptime) |
| `/api/tasks` | Task-Liste |
| `/api/projects` | Token-Verbrauch pro Projekt |
| `/api/calendar` | Content-Kalender |
| `/api/pipeline` | Nolea n8n Pipeline-Status |
| `/api/diary` | Tagebuch-Einträge (letzte 5) |
| `/api/diary/stats` | Weekly Stats |
| `/api/diary/goals` | Tägliche Ziele |
| `/api/diary/today` | Heutiger Eintrag |
| `/api/sessions/{session_id}` | Session-Details (Messages) |
| `/api/export/tokens` | Token-Daten als CSV |
| `/api/export/tokens.json` | Token-Daten als JSON |

### POST APIs
| Path | Beschreibung |
|------|-------------|
| `/api/diary/goals` | Goals speichern (Body: `{"goals": [...]}`) |
| `/api/cmd` | Command an Sub-Agent senden (Body: `{"agent": "...", "command": "..."}`) |

---

## 3. Für Julian's Hermes Agent — Skill / Konfiguration

Julian's Hermes braucht folgendes in den Skills oder als Setup:

### Cron-Job für regelmäßigen API-Poll
```yaml
# Beispiel: Alle 30 Minuten Status abrufen
job:
  name: "dashboard-status-pull"
  schedule: "*/30 * * * *"
  command: "curl -s http://100.103.196.11:8383/api/status | jq ."
```

### Tailscale Verbindungs-Check
```bash
#!/bin/bash
# connect-dashboard.sh
TS_IP="100.103.196.11"
PORT="8383"
if curl -s --connect-timeout 3 "http://$TS_IP:$PORT/api/status" > /dev/null; then
    echo "✅ Dashboard connected"
else
    echo "❌ Dashboard nicht erreichbar — Tailscale läuft?"
fi
```

---

## 4. Troubleshooting

| Problem | Lösung |
|---------|--------|
| Dashboard nicht erreichbar | Tailscale auf BEIDEN Seiten prüfen (`tailscale status`) |
| Julian sieht suffix nicht | Beide im gleichen Account (`babyprobo.09@gmail.com`) |
| Port 8383 blocked | Dashboard läuft auf `0.0.0.0:8383` — von überall im Tailnet erreichbar |
| CORS Probleme | Dashboard hat `Access-Control-Allow-Origin: *` — kein Problem |
| Dashboard läuft nicht | Auf Damian's PC: `bash ~/.hermes/scripts/start-dashboard.sh` |
| Dashboard-Neustart | `pkill -f dashboard-server.py && bash ~/.hermes/scripts/start-dashboard.sh` |

---

## 5. Netzwerk-Infos

| Info | Wert |
|------|------|
| Damian's Hostname | Suffix (WSL) |
| Damian's Tailscale IP | 100.103.196.11 |
| Dashboard Port | 8383 |
| Account | babyprobo.09@gmail.com |
| Subnetz | 192.168.178.0/24 (LAN) |
| Dashboard Root | `/mnt/d/hermes/multi-agent/dashboard/` |
| Shared Data | `/mnt/d/hermes/multi-agent/shared/` |

---

Erstellt: 2026-05-16 von Jeff (Hermes @ Suffix)
