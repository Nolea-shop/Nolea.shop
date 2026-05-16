---
name: noela-shop-daily-pipeline
description: Tägliche Nolea.shop Produkt-Pipeline — n8n Workflow "Nolea Produkt und Content" (116 Nodes, 4 Nischen), n8n-Executions-Monitoring, KI-Fotos, Social Media Cross-Posting, Telegram Bot.
triggers:
  - "Nolea"
  - "Nolea.shop"
  - "daily pipeline"
  - "Tagesproduktion"
  - "shop pipeline"
  - "n8n pipeline"
  - "Produkt Workflow"
---

# Nolea.shop — Tägliche Produkt-Pipeline

## 🛑 ABSOLUTE REGELN (Damian, 2026-05-16)

**CRITICAL — Diese Regeln stehen über allem anderen:**
- **NIEMALS** n8n Workflows löschen, egal ob per API, SQLite, oder Dateimanipulation
- **NIEMALS** die n8n Datenbank (`~/.n8n/`, Windows `.n8n/`) löschen, zurücksetzen, oder direkt via SQLite manipulieren
- **NIEMALS** n8n Anmeldedaten ändern (Passwort, Email, Owner-Setup)
- **Erlaubt:** n8n Prozesse starten/stoppen (kill/restart)
- **Erlaubt:** Workflows via n8n WebUI bearbeiten
- **Erlaubt:** Workflow-Daten via REST API lesen
- **Begründung:** Der originale 116-Node Workflow ging durch einen DB-Reset verloren — das passiert kein zweites Mal.

## LIVE n8n Workflow

- **Workflow ID:** `1zHhhqvq6dZZiqcc`
- **Name:** "Nolea Produkt und Content"
- **Nodes:** 3 (Schedule + Nischen Selector + HTTP Calendar Push)
- **API Auth:** Cookie-basiert (`/tmp/n8n_cookies.txt`) — Login: `admin@nolea.shop / Nolea2024!`
- **n8n Version:** 2.20.9 (WSL), Binary: `/home/damia/.hermes/node/bin/n8n`
- **DB:** `/home/damia/.n8n/` (SQLite, WSL local)
- **Dashboard:** `/pipeline` auf Port 8383 — Live-Status aller 4 Nischen, alle 8s Refresh
- **Execution Monitoring:** `/api/v1/executions?workflowId=WCopdGEIx5F6Q3ZF&status=running` — erkennt manuelle + schedule-gestartete Runs
- **Triggers:** `scheduleTrigger` um 08:00, 12:00, 16:00, 20:00 — und manuell via n8n-UI "Execute Workflow"

## Server-Konfiguration (dashboard-server.py)

```python
N8N_API_KEY = "<user-provided-key>"  # Vom User via Settings → API in n8n generiert
N8N_BASE = "http://localhost:5678/api/v1"
N8N_WORKFLOW_ID = "WCopdGEIx5F6Q3ZF"
NICHES = ["Gebäck", "Gesundheit", "Produktivität", "Sport"]
```

### Wichtige API-Endpunkte

| Endpunkt | Zweck |
|----------|-------|
| `GET /api/v1/workflows/{id}` | Workflow-Daten + Node-Struktur |
| `GET /api/v1/executions?workflowId={id}&status=running` | Laufende Execution prüfen |
| `POST /api/v1/workflows/{id}/activate` | Workflow aktivieren (mit `versionId`) |

### Execution Detection (key pattern)

```python
def get_n8n_executions():
    """Prüft ob der Workflow gerade läuft (manuell ODER per Schedule)"""
    try:
        req = urllib.request.Request(f"{N8N_BASE}/executions?workflowId={N8N_WORKFLOW_ID}&status=running&limit=3",
            headers={"X-N8N-API-KEY": N8N_API_KEY})
        with urllib.request.urlopen(req, timeout=5) as r:
            d = json.loads(r.read())
            if "data" in d: d = d["data"]
            if isinstance(d, list) and len(d) > 0:
                e = d[0]
                return {"running": True, "id": e.get("id","?"), "started": e.get("startedAt","?")[:19], 
                        "mode": e.get("mode","?")}  # "manual" oder "trigger"
    except: pass
    return {"running": False}
```

**Wichtig:** `mode` zeigt ob der Workflow manuell (`"manual"`) oder per Schedule (`"trigger"`) gestartet wurde — unterscheidbar in der UI.

## Die 4 Nischen

| # | Nische | Farbe | Dot |
|---|--------|-------|-----|
| 1 | **Gebäck** | 🔵 #0071e3 | 🥐 |
| 2 | **Gesundheit** | 🟣 #af52de | 💚 |
| 3 | **Produktivität** | 🟢 #30d158 | 💼 |
| 4 | **Sport** | 🟠 #ff9f0a | 🏋️ |

## Pipeline Phasen (Dashboard /pipeline)

Jede Nische durchläuft 5 Phasen, gruppiert aus den echten n8n-Nodes:

| Phase | Icon | Nodes (Beispiel) | Count |
|-------|------|------------------|-------|
| 🔍 Recherche | 🔍 | Reddit Search, Subreddit Crawler, Google News, Extra Quellen, Reddit Comments, TikTok Search, Facebook Search, Instagram Search, gutefrage.net | 9 |
| 📊 Analyse | 📊 | Gap Analyzer, Price Scanner | 2 |
| ✍️ Content | ✍️ | AI Konzept, Konzept, HTML+Caption, Slide Prompts, SEO Blog, Blog→File | 6 |
| 📦 Output | 📦 | HTTP PDF, HTML→PDF, Save to Memory | 3 |
| 🤖 Telegram | 🤖 | TG Text, TG PDF, TG Prompts, TG Gap Report, TG Blog | 5 |

Pro Nische: **25 Nodes** in 5 Phasen. Shared/System: **~16 Nodes** (Scheduler, Memory, Process Memory).

### Live-Status-Anzeige

Im Dashboard `/pipeline`:
- **Alle Phasen auf `● running`** wenn eine Execution aktiv ist (egal ob manuell oder Schedule)
- **Alle Phasen auf `○ idle`** wenn keine Execution läuft
- **Pulsierende grüne Animation** auf der Status-Bar und allen Phasen-Cards während der Ausführung
- **Execution ID + Startzeit** in der Status-Bar sichtbar
- **Mode** (manual/trigger) wird erkannt und angezeigt

## PipelineSteps

```python
steps = ["research", "analysis", "content", "output", "telegram"]
step_names = {
    "research": "🔍 Recherche",
    "analysis": "📊 Analyse", 
    "content": "✍️ Content",
    "output": "📦 Output",
    "telegram": "🤖 Telegram"
}
step_icons = {"research": "🔍", "analysis": "📊", "content": "✍️", "output": "📦", "telegram": "🤖"}
```

## Node-Gruppierung (Python-Logik)

Die Nodes werden aus dem n8n-Workflow-JSON gelesen und per Nischen-Namen gefiltert:

```python
# Nischen-Nodes filtern (Config-Nodes ausschließen)
niche_nodes = [n for n in all_nodes if niche in n.get("name","") and "Config" not in n.get("name","")]

# In Phasen gruppieren
for phase in phases:
    phase_nodes = [n for n in niche_nodes if any(x in n.get("name","") for x in phase_keywords)]
```

**Wichtig:** `Config: X1` Nodes werden explizit ausgeschlossen, da sie nur Konfigurationsdaten halten und keine aktiven Workflow-Schritte darstellen.

## Dashboard Integration

- **Route:** `/pipeline` (served by dashboard-server.py via `elif self.path in ["/activity","/health","/tasks","/calendar","/pipeline"]`)
- **Route:** `/calendar` — serviert den Content Calendar (`content-calendar.html`)
- **API:** `/api/pipeline` → JSON mit allen Nischen, Phasen, Node-Counts, Workflow-Status
- **API:** `/api/calendar-entries` → JSON mit Calendar-Einträgen aus `entries.json` (CORS-Header)
- **Frontend:** `dashboard/pipeline.html` — Eigenständige Seite, kein Modal
- **Live-Update:** `setInterval(load, 8000)` — alle 8s wird `/api/pipeline` neu geladen
- **Status-Bar:** Workflow-Name, Status (Running/Idle mit Live-Dot), Node-Count, Execution-Details
- **Nischen-Cards:** Farbcodiert, mit Node-Count-Badge, Phasen als horizontale Step-Karten
- **Nav-Leiste:** Dashboard-Footer hat Links zu `/calendar` und `/pipeline`

## 📅 Multi-Agent Content Calendar

**Standalone HTML** — Apple-Style Glassmorphism, Dark Mode, Inter Font.
Für ALLE Projekte (NOLEA, SSSALTY, AI_CONTENT, AI_SMART_HOME) und ALLE User (Damian, Julian, Beide).

### Standort
- **HTML:** `/home/damia/.hermes/shared/calendar/content-calendar.html`
- **Dashboard:** `http://localhost:8383/calendar`
- **API (GET):** `http://localhost:8383/api/calendar-entries` → liefert `entries.json`
- **API (POST):** `http://localhost:8383/api/calendar-entries` → neuen Eintrag hinzufügen
- **Daten-Datei:** `/home/damia/.hermes/shared/calendar/entries.json`
- **Push-Script:** `/home/damia/.local/bin/calendar-push.py`

### Daten-Format
```json
{
  "id": "abc123",
  "date": "2026-05-16",
  "user": "damian|julian|both",
  "project": "NOLEA|SSSALTY|AI_CONTENT|AI_SMART_HOME|...",
  "title": "Produkt-Titel",
  "desc": "Beschreibung",
  "type": "product|task|post|event|meeting|note|design|other",
  "status": "planned|in_progress|done|cancelled",
  "tags": ["n8n", "produkt"]
}
```

### n8n HTTP Request Node Configuration

Für jede Nische am Ende der Pipeline (nach Telegram-Phase) eine neue HTTP Request Node einfügen:

**HTTP Request Node Config:**
```json
{
  "method": "POST",
  "url": "http://localhost:8383/api/calendar-entries",
  "sendBody": true,
  "bodyParameters": {
    "parameters": [
      {"name": "date", "value": "={{ $json.date || $today.format('YYYY-MM-DD') }}"},
      {"name": "user", "value": "damian"},
      {"name": "project", "value": "NOLEA"},
      {"name": "title", "value": "={{ $json.title }}"},
      {"name": "desc", "value": "={{ $json.desc || '' }}"},
      {"name": "type", "value": "product"},
      {"name": "status", "value": "done"},
      {"name": "niche", "value": "={{ $json.niche }}"},
      {"name": "tags", "value": "n8n, nolea"}
    ]
  },
  "options": {
    "timeout": 5000
  }
}
```

### Push-Script (für cron/Hermes/Julian)
```bash
# Via API
python3 /home/damia/.local/bin/calendar-push.py \
  --date 2026-05-16 --user damian --project NOLEA \
  --title "Mein Produkt" --type product --status done

# Via CLI (ohne Dashboard, direkter File-Write)
python3 /home/damia/.local/bin/calendar-push.py \
  --date 2026-05-16 --user julian --project SSSALTY \
  --title "T-Shirt Upload" --type task --status in_progress

# Batch aus JSON-Datei
python3 /home/damia/.local/bin/calendar-push.py --file entries.json --api http://localhost:8383/api/calendar-entries
```

### Dashboard-Server Calendar-Route
Der `dashboard-server.py` hat fruehe return-Pfade in `do_GET()` plus neue `do_POST()`:

- `GET /calendar` oder `/calendar.html` → sendet `content-calendar.html`
- `GET /api/calendar-entries` → sendet `entries.json` mit CORS-Header
- `POST /api/calendar-entries` → akzeptiert JSON (Object oder Array), hängt an `entries.json` an
- `OPTIONS /api/calendar-entries` → CORS Preflight (204)
- `PUT /api/calendar-entries` → ersetzt komplette entries.json (für Sync/Migration)

## Ausstehend

- [ ] Social Media Accounts konfigurieren (TikTok/Insta/FB)
- [ ] AI Influencer (1-3) für Produkt-Videos
- [ ] SSSALTY Projekt-Details
- [ ] Lokales Model statt Claude/Sonnet
- [ ] n8n Bridge Server für Dashboard-Workflow-Kommunikation

## Verwandte Skills

- `n8n-workflow-automation` — n8n Setup, API, Pitfalls
- `n8n-api-control` — REST API Steuerung
- `noela-digital-products` — Shop-Management
- `telegram-bot-handler` — Telegram Integration
- `multi-agent-system-architecture` — Dashboard /pipeline Route, SSE-Updates
