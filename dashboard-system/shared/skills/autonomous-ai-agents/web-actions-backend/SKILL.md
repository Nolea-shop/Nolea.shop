---
name: web-actions-backend
description: "Web-Action-Backend-Auswahl und -Konfiguration für Hermes Agent — TinyFish (primary), DDGS (fallback), Custom Endpoints. Steuert Suche, Fetch und Browser-Automation."
trigger_patterns:
  - "web backend"
  - "search backend"
  - "fetch backend"
  - "browser automation"
  - "web action backend"
  - "TinyFish config"
author: Hermes Agent + User (Damia)
version: 1.0.0
---

# Web-Actions-Backend für Hermes Agent

Dieser Skill steuert, welcher Dienst für Web-Aktionen (Suche, HTTP-Fetch, Browser-Automation) verwendet wird. Er definiert die primäre Backend-Wahl (TinyFish), Fallbacks (DDGS) und Custom-Endpoint-Konfiguration.

## When to load this skill

Load when:
- User asks to configure web search/fetch/browser tools
- Switching between search backends (TinyFish ↔ DDGS ↔ Custom)
- Debugging web tool failures (no results, timeout, auth errors)
- Setting up `TINYFISH_API_KEY` or other backend credentials
- „Web-Aufgaben“ / „fetch“ / „browser automation“ werden erwähnt

## Backend-Optionen im Überblick

| Backend | Typ | API-Key | Kosten | Empfohlene Verwendung |
|---------|-----|---------|--------|----------------------|
| **TinyFish** | Dedizierter Web-Service | Ja (`TINYFISH_API_KEY`) | Bezahlt/Quota | Primär für alle Web-Aktionen (Search, Fetch, Browser) |
| **DDGS** | DuckDuckGo (kostenlos) | Nein | Free | Fallback für allgemeine Suche, wenn TinyFish nicht verfügbar |
| **Custom** | Selbst gehosteter Endpoint | Optional | — | Spezielle interne/private Search-Backends |

⚠️ **Wichtige Unterscheidung:** TinyFish ist **kein LLM-Provider** Es bietet keine Chat-Modelle. Es ist ein spezialisierter Web-Action-Dienst (Search/Fetch/Browser). Konfiguriere es unter `web.backend`, **NICHT** unter `model.provider`.

## TinyFish – Primary Backend

TinyFish ist der standardmäßige Web-Action-Backend für alle Fetch-, Search- und Browser-Automation-Aufgaben.

### Setup (einmalig)

1. **API-Key beschaffen** – über das TinyFish Dashboard oder bereitgestellten Key
2. **Umgebungsvariable setzen** – in `~/.hermes/.env`:
   ```
   TINYFISH_API_KEY=sk-tinyfish-...
   ```
3. **Backend konfigurieren** – in `config.yaml` oder via CLI:
   ```bash
   hermes config set web.backend tinyfish
   hermes config set web.search_backend tinyfish
   ```
4. **Session neu starten** – `/reset` (CLI) oder `/restart` (Gateway)

### Endpoints & Domains

| Dienst | Endpoint | Domain |
|--------|----------|--------|
| Search | `GET https://api.search.tinyfish.ai?query=<query>&limit=<N>` | `.ai` (nicht `.io`) |
| Fetch | `GET https://api.search.tinyfish.ai/fetch?url=<url>` | `.ai` |
| Browser | `POST https://api.search.tinyfish.ai/browser/...` | `.ai` |

Header für alle Requests: `X-API-Key: sk-tinyfish-...`

### Verwendung in Sessions

Sobald konfiguriert, verwenden alle Web-Tools automatisch TinyFish:
- `web_search(query)` → TinyFish Search API
- `fetch_url(url)` → TinyFish Fetch API
- `browser_navigate(url)` → TinyFish Browser API

Keine zusätzlichen Parameter nötig – die Integration ist transparent.

## DDGS – Free Fallback

Falls TinyFish-Quota erschöpft ist oder der Dienst nicht erreichbar, auf DuckDuckGo Search (kostenlos, kein API-Key) umschalten:

```bash
# DDGS installieren
pip install duckduckgo_search

# Konfiguration
hermes config set web.backend ddgs
hermes config set web.search_backend ddgs
```

**Einschränkung:** DDGS bietet nur Search, kein Fetch oder Browser-Automation. Für diese Funktionen muss TinyFish wieder aktiviert werden.

## Custom Endpoint

Für selbst gehostete Suchdienste oder interne APIs:

```yaml
web:
  backend: custom
  custom:
    base_url: https://search.internal.company.com/api
    api_key: ${CUSTOM_SEARCH_API_KEY}  # Optional
    headers:
      X-Custom-Header: value
```

In `config.yaml`:
```yaml
web:
  backend: custom
  custom:
    base_url: https://...
    api_key: xxx
```

## Environment Variables

| Variable | Zweck | Erforderlich |
|----------|-------|--------------|
| `TINYFISH_API_KEY` | TinyFish Auth-Header | Ja (für TinyFish) |
| `CUSTOM_SEARCH_API_KEY` | Custom Backend Auth | Optional |

Setzen in `~/.hermes/.env` oder im Shell-Profil (`~/.bashrc`).

## Verification

Nach der Konfiguration prüfen:
```bash
# 1. Config anzeigen
hermes config get web.backend
hermes config get web.search_backend

# 2. Kurze Suchanfrage testen (im Hermes Chat)
hermes chat -q "Suche nach 'Hermes Agent'"

# 3. Bei Fehlern: Logs prüfen
grep -i tinyfish ~/.hermes/logs/*.log | tail -20
```

Typische Fehler:
- `401 Unauthorized` → `TINYFISH_API_KEY` falscht oder nicht gesetzt
- `403 Forbidden` → Quota/限额 erschöpft
- `Timeout` → Netzwerk/Proxy-Problem (prüfe `http_proxy`/`https_proxy`)

## Pitfalls

1. **Domain-Verwechslung** – Endpoint ist `api.search.tinyfish.ai` (`.ai`), nicht `.io`. Falsche Domain = 404/Connection-Error.
2. **TinyFish als LLM-Provider** – Versuche nie, TinyFish unter `model.provider` zu konfigurieren. Es ist kein Chat-Modell. Du bekommst `Invalid model` oder `Unsupported provider`.
3. **DDGS als Alles-Ersatz** – DDGS kann nur Search, kein Fetch/Browser. Wenn du `fetch_url()` mit DDGS-Backend aufrufst, wird es fehlschlagen.
4. **Gateway vs CLI** – Config-Änderungen via `hermes config set` wirken sofort für neue CLI-Sessions, aber der **Gateway** muss mit `/restart` neugestartet werden, damit die Änderung in Telegram/Discord wirksam wird.
5. **API-Key in config.yaml** – Speichere敏感 Keys nur in `~/.hermes/.env`, niemals in `config.yaml` (das wird oft committet/gelesen). Verwende `${VAR}`-Substitution in `config.yaml`, wenn ein Key im Custom-Backend benötigt wird.

## See also

- `hermes-agent` skill – Vollständige Hermes-Konfigurationsreferenz, Gateway-Setup, Provider-Liste
- `references/tinyfish-search-api.md` – API-Spezifikation, Request/Response-Beispiele
- `references/web-actions-backend.md` – Detaillierte Backend-Vergleiche, Performance-Metriken, Quota-Management
