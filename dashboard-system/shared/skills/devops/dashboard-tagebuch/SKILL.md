---
name: dashboard-tagebuch
description: Tägliche Session-Zusammenfassung als Tagebucheintrag auf dem Multi-Agent Dashboard (Port 8383). Cron-Job um 23:00 Uhr, Apple-Design Frontend, Python Backend.
version: 1.0
---

# Dashboard Tagebuch (Diary) System

## Live-Updates (alle 3 Minuten)

Der `tagebuch-live` Cron-Job (no_agent, alle 3 Minuten) updated die diary.json live mit jeder neuen Session.

**Script:** `~/.hermes/scripts/diary-live-update.py`
- Liest state.db für heutige Sessions
- Auto-Tags: bug, feature, config, design, devops, social, automation, communication, infrastructure, voice
- Produktivitäts-Ratio: productive vs fuckaround (Keyword-basiert)
- Heatmap: stündliche Aktivität
- Kosten / Token / Session-Count
- Schreibt diary.json + diary-stats.json

## Frontend: diary.html

Apple-Design Single-Page-App mit 4 Tabs:

| Tab | Features |
|-----|----------|
| 📝 Live | Stats-Tiles, Heatmap, Token-Chart, Goals, Entry-Cards mit Sessions |
| 📊 Stats | Weekly Token-Chart, Cost-Chart, Session-Chart |
| 🎯 Goals | Tägliche Todo-Liste (CRUD via /api/diary/goals) |
| 📚 History | Wochen/Monat/Alle Ansicht mit Suchfilter |

**Features:**
- Session-Titles klickbar → Modal mit Nachrichten-Verlauf
- Search-Filter über alle Einträge
- Telegram Notification Button
- Auto-Refresh alle 30 Sekunden
- Produktivitäts-Meter (grün/gelb/rot)
- Chart.js für Weekly-Token-Chart

## API Endpoints (dashboard-server.py)

| Endpoint | Beschreibung |
|----------|-------------|
| `GET /api/diary` | Letzte 5 Diary-Einträge |
| `GET /api/diary/today` | Heutigen Eintrag |
| `GET /api/diary/stats` | Weekly Chart-Daten |
| `GET /api/diary/goals` | Goals abrufen |
| `POST /api/diary/goals` | Goals speichern |
| `GET /api/diary/notify` | Telegram-Notify |
| `GET /api/sessions/<id>` | Session-Nachrichten |

## Cron Jobs

| Name | Schedule | Beschreibung |
|------|----------|-------------|
| `tagebuch-live` | alle 3m | Live-Diary-Update (no_agent) |
| `tagebuch-wochen-highlight` | So 20:00 | AI-Wochenrückblick |

## Dateien

| Pfad | Zweck |
|------|-------|
| `~/.hermes/scripts/diary-live-update.py` | Live-Updater Script |
| `~/.hermes/scripts/diary-weekly-stats.py` | Weekly Stats für Cron |
| `/mnt/d/hermes/multi-agent/shared/diary.json` | Diary Datenspeicher |
| `/mnt/d/hermes/multi-agent/shared/diary-stats.json` | Weekly Chart-Daten |
| `/mnt/d/hermes/multi-agent/shared/diary-goals.json` | Goals Speicher |
| `/mnt/d/hermes/multi-agent/dashboard/diary.html` | Frontend-Seite |
| `/mnt/d/hermes/multi-agent/scripts/dashboard-server.py` | Backend (API)

## Übersicht

Automatische Tageszusammenfassung aller Hermes-Sessions, gespeichert als Tagebucheintrag auf dem Multi-Agent Dashboard.

## Komponenten

### Premium Dashboard Page Rewrite Patterns

Alle Dashboard-Seiten (diary, calendar, tasks, pipeline, health, activity) teilen das gleiche **Cherry-Wood Glassmorphism** Design-System. Bei einem kompletten Rewrite folge diesen Mustern:

#### Cherry-Wood Glassmorphism Palette

| Rolle | Wert | Zweck |
|-------|------|-------|
| Warm background | `#fafafa` (Seite), `#f3f0ea` (Cards) | Kein kaltes Weiß |
| Coral accent | `--accent-coral = #ff5733` | Primärer Akzent (Today, Headlines) |
| Coral tint | `--tint-coral = rgba(255,87,51,0.12)` | Leichte Akzente |
| Glass card | `var(--glass) = rgba(255,255,255,0.55)` + `backdrop-filter: blur(20px)` + `border: 1px solid rgba(0,0,0,0.06)` + `border-radius: 18px` | Basis aller Cards |
| Serif italic | `var(--font-serif)` | Überschriften, große Zahlen |
| Sans-serif | `var(--font-sans)` = Inter | Labels, UI-Text |
| Type-Farben | product=`#30d158`, visual=`#af52de`, social=`#0071e3`, blog=`#ff9f0a`, telegram=`#00b8e6`, dev=`#5a5a5a`, setup=`#ff453a`, influencer=`#ff375f` | Color-Coded Badges |

#### GSAP Reveal + Stagger

```js
// Initial beim Laden
gsap.to(".gsap-reveal", { opacity: 1, y: 0, duration: 0.8, stagger: 0.04, ease: "power4.out" });

// Nach dynamischen Updates (Grid-, Timeline-Render)
gsap.fromTo(targets, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.008, ease: 'power3.out' });
```

#### Month-Grid + Event Dots Pattern

1. Backend liefert gruppierte Daten: `{ date, day, weekday, is_today, is_past, items: [{title, type, done, time}] }`
2. Grid 7 Spalten, padding vor dem 1. des Monats bis zur korrekten Wochentagspalte (`month_start_weekday`)
3. Farbdots pro Tag nach `TYPE_COLORS` (max 5 Dots, `flex-wrap: wrap`)
4. `today` → Coral-Hintergrund, `past` → `opacity: 0.6`, `future` → `border: dashed`
5. Klick auf Tag → Day Detail Modal öffnen.

#### Dateien

| Pfad | Zweck |
|------|-------|
| `references/hermes-state-db-schema.md` | Hermes state.db Schema + nützliche Queries |
| `references/dashboard-server-patterns.md` | BaseHTTPRequestHandler Patterns (Path Matching, SSE) |

### 2. Dashboard Backend: `/mnt/d/hermes/multi-agent/scripts/dashboard-server.py`
- `/api/diary`, `/api/diary/stats`, `/api/diary/goals`, `/api/diary/today`, `/api/diary/notify`
- `/api/calendar` Endpunkt (gruppierte Monatsdaten)
- `/diary` + `/calendar` + `/tasks` + `/pipeline` + `/health` + `/activity` Seiten

### 3. Dashboard Frontend: `diary.html` + `calendar.html` + `tasks.html` + `pipeline.html` + `health.html` + `activity.html`
Apple-Design Seiten mit:
- Stats-Chips, Month-Grid mit Event-Dots (Calendar)
- Timeline mit Type-Filter, Day-Detail-Modal (Calendar)
- Entry-Cards mit Datum, Titel, Summary (Diary)
- Responsive Design, GSAP reveal animations

### 4. Cron Job: `tagebuch-daily-summary`
- Schedule: `0 23 * * *` (täglich 23:00 Uhr)
- Script: `diary-session-extract.py` (gibt heutige Sessions aus)
- Toolsets: terminal, file
- Schreibt neuen Eintrag an `/mnt/d/hermes/multi-agent/shared/diary.json`

### 1. Datenquelle: `~/.hermes/scripts/diary-session-extract.py`
Extrahiert alle Sessions des heutigen Tages aus der Hermes state.db (SQLite).
- Liest `sessions`-Tabelle (started_at, title, message_count, tokens, cost)
- Liest erste User-Nachricht und letzte Assistant-Antwort pro Session
- Aggregiert: Session-Count, Total-Tokens, Projekte (aus Titeln)

## Diary JSON Format

```json
{
  "date": "2026-05-16",
  "title": "Tagebucheintrag — 16. Mai 2026",
  "summary": "Heute wurde...",
  "highlights": ["Fix XYZ", "Feature ABC"],
  "sessions": ["session-id-1"],
  "metrics": {
    "session_count": 7,
    "total_tokens": 10675109,
    "projects": ["Hermes", "Nolea"]
  },
  "created_at": "2026-05-16T23:00:00+02:00"
}
```

## Pitfalls

### BaseHTTPRequestHandler path matching mit Query-Parametern
Der Dashboard-Server verwendet `BaseHTTPRequestHandler` mit `self.path == "/api/..."` exaktem Matching.
Das Frontend ruft aber oft mit Query-Parametern auf (`/api/diary?limit=30`), was am `==` scheitert.

**Fix:** Immer `==` UND `startswith("?...")` prüfen:
```python
elif self.path == "/api/diary" or self.path.startswith("/api/diary?"):
```

Alternativ: `urllib.parse.urlparse(self.path).path` für sauberes Pfad-Matching nutzen.

### Cron-Job: Script-Pfad muss relativ sein
Scripts in `cronjob` müssen relativ zu `~/.hermes/scripts/` angegeben werden.
Absolute Pfade wie `/home/damia/.hermes/scripts/...` werden zurückgewiesen.

### Cron-Job benötigt Toolsets
Ohne `enabled_toolsets` kann der Cron-Agent keine Dateien schreiben.
Immer `terminal` und `file` setzen bei Dateioperationen:
```python
enabled_toolsets=["terminal", "file"]
```

## Dateien

| Pfad | Zweck |
|------|-------|
| `~/.hermes/scripts/diary-session-extract.py` | Session-Extraktion Script |
| `/mnt/d/hermes/multi-agent/shared/diary.json` | Diary Datenspeicher |
| `/mnt/d/hermes/multi-agent/dashboard/diary.html` | Frontend Seite |
| `/mnt/d/hermes/multi-agent/scripts/dashboard-server.py` | Backend (enthält `/api/diary`) |
| `references/hermes-state-db-schema.md` | Hermes state.db Schema + nützliche Queries |
| `references/dashboard-server-patterns.md` | BaseHTTPRequestHandler Patterns (Path Matching, SSE) |
