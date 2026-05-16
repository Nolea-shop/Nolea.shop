# Dashboard Architecture (v2)

## Pattern: Static HTML + JSON API + SSE

The dashboard uses a **hybrid architecture** — the frontend is a standalone HTML file with embedded CSS/JS, data comes from JSON API endpoints, and live updates arrive via **Server-Sent Events (SSE)** with granular event types.

### Why SSE instead of Polling?

**Vorher:** `setInterval(fetch('/api/status'), 15000)` + `<meta http-equiv="refresh" content="15">` = 240 Requests/h, komplettes UI-Rerendering jedes Mal.

**Nachher:** Einmalige `EventSource('/api/events')`-Verbindung, Server pusht **nur bei echten Änderungen** als **named Events** (`system`, `tailscale`, `tokens`, `processes`, `agents`). Client updated **nur die DOM-Elemente des jeweiligen Events**.

### ⚠️ Critical: ThreadedHTTPServer Required

`BaseHTTPServer` ist **single-threaded**. Eine einzige SSE-Verbindung (die eine `while True`-Loop startet) blockiert den gesamten Server. **Immer `ThreadingMixIn` verwenden:**

```python
from socketserver import ThreadingMixIn
from http.server import HTTPServer, BaseHTTPRequestHandler

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

# ... später:
ThreadedHTTPServer(("0.0.0.0", port), Handler).serve_forever()
```

### Change-Detection per MD5

Jeder Datenbereich hat einen eigenen MD5-Hash-Key im globalen Cache `_snapshots = {}`. Die Funktion `_changed(key, data)` berechnet `hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()` und vergleicht mit dem letzten Wert. Nur bei Abweichung wird ein SSE-Event gesendet.

### Granulare SSE Events

Server sendet **named Events** statt einem einzigen `data:`-Stream:

```
event: system\ndata: {"host":"Suffix","time":"...","uptime":"..."}
event: tailscale\ndata: {"status":"Connected","ip":"100.103.196.11",...}
event: tokens\ndata: {"openrouter":{...},"nous":{...}}
event: processes\ndata: {"hermes":"10","gateway":"Running",...}
event: agents\ndata: [...]  // Sub-Agents-Liste
```

Client registriert separate Listener pro Event:

```javascript
const evtSource = new EventSource('/api/events');

evtSource.addEventListener('system', function(e) {
  const d = JSON.parse(e.data);
  set('data-host', d.host);
  set('data-time', d.time);
  set('data-uptime', d.uptime);
});

evtSource.addEventListener('tokens', function(e) {
  const d = JSON.parse(e.data);
  set('data-or-total', '$' + (d.openrouter?.total || '0.00'));
  // nur Token-Elemente updaten, nichts anderes
});
```

### File structure

```
D:\hermes\multi-agent\
├── dashboard/
│   ├── index.html          ← Haupt-Dashboard (Apple-Design)
│   ├── tokens.html         ← Token Analytics (Chart.js)
│   ├── activity.html       ← Activity Feed (Timeline)
│   ├── health.html         ← System Health (Gauges)
│   ├── tasks.html          ← Task Queue / Kanban
│   ├── calendar.html       ← Content Calendar (Nolea)
│   └── pipeline.html       ← Nolea Pipeline (3 Nischen)
└── scripts/
    └── dashboard-server.py ← Python HTTP server (Threaded!)
```

### Backend (`dashboard-server.py`)

Single-threaded-freundlicher Python HTTP Server mit `ThreadingMixIn`. Serviert:

| Route | Type | Description |
|-------|------|-------------|
| `/` | HTML | Haupt-Dashboard |
| `/tokens` | HTML | Token Analytics Seite |
| `/activity` | HTML | Activity Feed Seite |
| `/health` | HTML | System Health Seite |
| `/tasks` | HTML | Task Queue Seite |
| `/calendar` | HTML | Content Calendar Seite |
| `/pipeline` | HTML | Nolea Pipeline Seite |
| `/api/events` | SSE | Server-Sent Events (granular, push-only-on-change) |
| `/api/status` | JSON | Point-in-time Status (Fallback bei SSE-Abbruch) |
| `/api/tokens` | JSON | OpenRouter + Nous Usage |
| `/api/sub-agents` | JSON | 13 Agents (name, model, category, approval, active) |
| `/api/activity` | JSON | Letzte 20 Events |
| `/api/health` | JSON | RAM, CPU, Disk, Prozesse, D:-Disk |
| `/api/tasks` | JSON | Task-Queue |
| `/api/projects` | JSON | Per-Project Token Breakdown |
| `/api/calendar` | JSON | Content-Kalender (Nolea) |
| `/api/pipeline` | JSON | Nolea Pipeline-Status |
| `/api/export/tokens` | CSV | Token-Usage als Download |
| `/api/export/tokens.json` | JSON | Token-Usage als JSON |
| `/api/cmd` | POST | Command-Ausführung (simuliert) |

### Frontend Design System (Apple-Stil)

Der Benutzer bevorzugt **Apple-ähnliches Design**:
- **Font:** `'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui`
- **Background:** `#fafafa` (hell), keine Dark-Theme-Container
- **Surface:** `rgba(255, 255, 255, 0.72)` mit `backdrop-filter: saturate(180%) blur(20px)` (Glassmorphismus)
- **Border:** `rgba(0, 0, 0, 0.06)` — extrem subtil
- **Radien:** 18px (Cards), 12px (Icons), 100px (Pills/Buttons)
- **Farben:** `#0071e3` (accent/blue), `#30d158` (green), `#ff9f0a` (orange), `#af52de` (purple), `#ff3b30` (red)
- **Text:** `#1d1d1f` (primary), `#6e6e73` (secondary), `#86868b` (muted)
- **Shadow:** Extrem weich (`0 1px 2px rgba(0,0,0,0.04)`)
- **Animation:** `cubic-bezier(0.22, 1, 0.36, 1)` (Apple-ähnliche Kurve)
- **Icons:** SVG-Sprite `<symbol>` im `<body>`, eingebunden per `<use href="#i-xxx"/>`
- **Gradient-Hintergründe:** `radial-gradient(circle, #c7e0ff, transparent 70%)` als Floating-Blobs

### Frontend Pattern-Regeln

1. **Jede dynamische Zelle kriegt `id="data-xxx"`** — `textContent` wird per JS gesetzt.
2. **Kein `<meta http-equiv="refresh">`** — das killt die SSE-Verbindung.
3. **Kein `setInterval` für Daten** — SSE pusht Änderungen.
4. **Klick-Handler via `onclick`-Attribut** — robuster als `addEventListener`.
5. **Sub-Agents Tabelle: `active: True/False`** — inaktive Agents mit `opacity: 0.45` + `(inactive)` Label.
6. **Chart.js per CDN** — `cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js`.
7. **Seiten statt Modals** — jede Feature-Kategorie bekommt eigene Route.
8. **Echte API-Daten, keine Platzhalter** — direkter OpenRouter-API-Call, keine synthetischen Token-Zahlen.

### Universal Command Bar

ChatGPT-artiges Eingabefeld direkt unter dem Dashboard-Header:

```html
<select id="cmd-agent">
  <option value="tokens">💰 Token Analytics</option>
  <option value="health">🩺 System Health</option>
  <!-- ... 20 Einträge für alle Pages + Agents + Tools -->
</select>
<input id="cmd-input" placeholder="Ask or command anything…" />
<button id="cmd-btn">→ Run</button>
```

Routing-Tabelle in JS:
```javascript
const routes = { 'tokens': '/tokens', 'health': '/health', 'export': '/api/export/tokens', ... };
```

Agent-Commands werden per `POST /api/cmd` gesendet und im Dashboard inline angezeigt.

### Adding new data

1. Add a new Python function in `dashboard-server.py` that fetches/returns the data
2. Add a route in the `do_GET`/`do_POST` handler
3. Add the data to the SSE event loop under a new `_changed("newkey", data)` key
4. Add a `<span id="data-xxx">` in the HTML
5. Add an `evtSource.addEventListener('newevent', ...)` listener in the JS
6. Neustart nicht vergessen — sonst wird alte Version serviert

### Running

```bash
# From WSL
python3 /mnt/d/hermes/multi-agent/scripts/dashboard-server.py

# From Windows (double-click)
D:\hermes\multi-agent\start-dashboard.bat

# Port: 8383
# URL: http://localhost:8383
# API: http://localhost:8383/api/status
# SSE: http://localhost:8383/api/events
# Tailscale: http://100.103.196.11:8383
```

### Frontend customization

The HTML files can be given to any AI for restyling. Requirements:
- **Jedes dynamische Element muss `id="data-xxx"` behalten** — sonst bricht das Live-Update.
- **Der `<script>`-Block muss bleiben** — insbesondere die `evtSource.addEventListener(...)`-Listener.
- **Entferne KEIN `<meta charset>`, `<meta viewport>`, oder `<!DOCTYPE html>`** — das bricht Chart.js.
- **SSE statt Auto-Refresh:** Kein `<meta http-equiv="refresh">` einbauen! Es killt die SSE-Verbindung.
- **Chart.js CDN-Link muss bleiben** für Graphen auf Tokens/Health-Seiten.
