# Dashboard v2 Architecture

## Pattern: Static HTML + JS API Fetch

**Kernprinzip:** Der Benutzer gestaltet das HTML selbst (Apple-Design-Stil), ich integriere nur die Backend-Logik. Kein serverseitiges String-Replacement, keine Template-Engine — nur statische HTML + JS-Fetch.

```python
# Python-Server (dashboard-server.py)
# - Serviert statische HTML-Dateien aus BASE / "dashboard" / "{path}.html"
# - Bietet JSON-API-Endpoints unter /api/*
# - JS im HTML holt via EventSource (/api/events) Live-Daten
# - SSE sendet NAMED EVENTS — client updated nur betroffene DOM-Elemente
```

## API Endpoints

| Endpoint | Methode | Daten | Arbeitsweise |
|----------|---------|-------|-------------|
| `/api/status` | GET | Host, Tailscale, Tokens, Prozesse | Fallback für SSE-Ausfall |
| `/api/tokens` | GET | OpenRouter + Nous Details | Detaillierte Ansicht für Charts |
| `/api/sub-agents` | GET | 13 Agents, active/inactive | Einmalig beim Laden |
| `/api/activity` | GET | Letzte 20 Events | Timeline mit farbigen Dots |
| `/api/health` | GET | RAM%, Disk%, CPU, Services | Gauge-Charts + Summary Cards |
| `/api/tasks` | GET | Kanban-Queue | Status-Counter + Cards |
| `/api/projects` | GET | Per-Project Breakdown | Für Export/Übersicht |
| `/api/calendar` | GET | Content-Kalender | Geplante Events |
| `/api/events` | GET (SSE) | Granular: system, tailscale, tokens, processes | **Primäre Datenquelle** |
| `/api/export/tokens` | GET | CSV-Download | `Content-Disposition: attachment` |
| `/api/cmd` | POST | {agent, command} → simuliertes Ergebnis | Command Bar |

## Pages

| Route | File | Features |
|-------|------|----------|
| `/` | `dashboard/index.html` | Status Cards, Sub-Agents Tabelle, Navigationskarten, Command Bar |
| `/tokens` | `dashboard/tokens.html` | 3 Chart.js Graphen (Line, Doughnut, Bar), Limit-Bar, Provider-Table |
| `/activity` | `dashboard/activity.html` | Timeline mit farbigen Status-Dots, Live-Update |
| `/health` | `dashboard/health.html` | RAM/CPU/Disk Gauges, Service-Grid, Proc-Table |
| `/tasks` | `dashboard/tasks.html` | Stats-Bar (completed/running/pending), Task-Cards |

## Universal Command Bar

Ein ChatGPT-artiges Eingabefeld direkt unter dem Dashboard-Header:

```
[Select Agent/Page ▼] [What do you want to do?          ] [→ Run]
```

**Routing:**
- Page-names (tokens, activity, health, tasks) → navigiert zur Seite
- Export → löst CSV-Download aus
- Agent-names (social-pinterest, dev-coding, ...) → POST an `/api/cmd`
- Ergebnis wird direkt unter der Command-Bar eingeblendet

**Pattern:** Dropdown + Input + Button. Enter-Taste oder Klick löst `runCommand()` aus. Das `<select>` verwendet CSS-only SVG-Chevron via `background-image`.

## SSE (Server-Sent Events) — Granular Smart Updates

**2026-05-15: Dashboard von Polling auf SSE mit granularer Event-Verteilung umgestellt.**

### Problem
Früher: `setInterval(fetch('/api/status'), 15000)` — 240 Requests/h, gesamte UI neugerendert auch wenn nur ein Wert sich änderte. Zusätzlich `<meta http-equiv="refresh" content="15">` → kompletter Seiten-Reset alle 15s.

### Lösung: Named Events per Kategorie

Der Server prüft alle 5s **separat pro Kategorie** auf Änderung per MD5-Hash. Nur Kategorien mit geänderten Daten bekommen ein **benanntes SSE-Event**. Der Client lauscht nur auf die Events, die ihn interessieren, und **updated nur die dazugehörigen DOM-Elemente**.

**⚠️ CRITICAL: ThreadedHTTPServer erforderlich!**
`BaseHTTPServer` ist single-threaded — eine SSE-Verbindung blockiert den gesamten Server für alle anderen Requests. **Muss** durch `ThreadingMixIn` erweitert werden:
```python
from socketserver import ThreadingMixIn
from http.server import HTTPServer

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

# Statt: HTTPServer(...).serve_forever()
ThreadedHTTPServer((host, port), Handler).serve_forever()
```
Ohne dies: Server hängt sobald SSE-Client verbindet, Dashboard-Doppelklick blockiert, API-Endpoints antworten nicht.

### Server-Side Pattern

```python
import hashlib

_snapshots = {}
def _changed(key, data):
    s = hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()
    if _snapshots.get(key) != s:
        _snapshots[key] = s
        return True
    return False

# Im Handler:
if self.path == "/api/events":
    self.send_header("Content-Type", "text/event-stream")
    # ... headers ...
    def sse(event, data):
        self.wfile.write(f"event: {event}\ndata: {json.dumps(data)}\n\n".encode())
        self.wfile.flush()
    
    # Initial: alle Bereiche einmal
    sse("system", {"host": HOSTNAME, "time": now, "uptime": uptime})
    sse("tailscale", get_tailscale())
    sse("tokens", {"openrouter": or_u, "nous": nous_u})
    sse("processes", {"hermes": "4", "gateway": "Running", ...})
    
    # Watch-Loop
    while True:
        time.sleep(5)
        if _changed("system", data): sse("system", data)
        if _changed("tailscale", ts): sse("tailscale", ts)
        if _changed("tokens", t): sse("tokens", t)
        if _changed("procs", p): sse("processes", p)
```

### Client-Side Pattern

```javascript
const evtSource = new EventSource('/api/events');

evtSource.addEventListener('system', function(e) {
  const d = JSON.parse(e.data);
  set('data-host', d.host);
  set('data-time', d.time);
  set('data-uptime', d.uptime);
});

evtSource.addEventListener('tailscale', function(e) {
  // nur Tailscale-Elemente updaten
});

evtSource.addEventListener('tokens', function(e) {
  // nur Token-Elemente updaten
});

evtSource.addEventListener('processes', function(e) {
  // nur Prozess-Elemente updaten
});
```

### Critical: `<meta http-equiv="refresh">` ENTFERNEN

Das HTML darf kein auto-refresh haben:
```html
<!-- ❌ NIEMALS: macht harten Seiten-Refresh, killt SSE -->
<meta http-equiv="refresh" content="15">

<!-- ✅ RICHTIG: entfernt oder kommentiert -->
<!-- Kein auto-refresh — SSE pusht nur bei Änderung -->
```
Sonst wird die Seite alle N Sekunden komplett neugeladen, die SSE-Verbindung getrennt, und der ganze Sinn von SSE ist hinfällig.

### Vorteile
- ~0 Requests/h bei gleichbleibenden Daten (vorher: 240+/h)
- Server-CPU nahe null
- Nur betroffene DOM-Elemente werden geupdatet (kein Full-Rerender)
- Browser-native EventSource API
- Automatischer Reconnect

## Frontend-Patterns (aus diesem Projekt gelernt)

1. **`<select>` mit SVG-Chevron** — Kein JS-Plugin nötig:
   ```css
   select {
     appearance: none;
     -webkit-appearance: none;
     background-image: url('data:image/svg+xml;utf8,...');
     background-repeat: no-repeat;
     background-position: right 8px center;
     padding-right: 28px; /* WICHTIG: Platz für Pfeil */
   }
   ```

2. **Limit-Bar mit Shimmer-Animation** — Gradient + Animation hint:
   ```css
   .bar-fill::after {
     content: '';
     background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
     animation: shimmer 2.5s infinite;
   }
   ```
   Drei Farbstufen: green (<50%), orange (50-80%), red (>80%).

3. **Chart.js Destroy Pattern** — Charts müssen vor Neuzeichnen zerstört werden:
   ```javascript
   let charts = {};
   Object.values(charts).forEach(c => c && c.destroy());
   charts.history = new Chart(ctx, {...});
   ```

4. **Onclick statt addEventListener** — Bei einfachen Navigationen direkt `onclick="window.location.href='/tokens'"` im HTML. Robuster gegen JS-Fehler in anderen Scripten.

5. **Apple-Design Variablen** — Für Glassmorphismus:
   ```css
   :root {
     --surface: rgba(255, 255, 255, 0.72);
     --bg: #fafafa; --bg-soft: #f5f5f7;
     --border: rgba(0, 0, 0, 0.06);
     --text: #1d1d1f; --text-soft: #6e6e73;
     --radius: 18px;
     --ease: cubic-bezier(0.22, 1, 0.36, 1);
   }
   .card {
     background: var(--surface);
     backdrop-filter: saturate(180%) blur(20px);
     border: 1px solid var(--border);
     border-radius: var(--radius);
   }
   ```

6. **SSE Sub-Agents getrennt laden** — Sub-Agents sind stabil (wechseln selten). Einmalig per `fetch('/api/sub-agents')` beim Seitenstart laden, nicht über SSE. Nur bei `event: agents` neu laden.

7. **Fallback bei SSE-Ausfall** — `evtSource.onerror` sollte nach 5s einen `fetch('/api/status')`-Fallback ausführen, der alle Daten auf einmal holt.
