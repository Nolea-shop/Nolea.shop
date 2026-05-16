# Web Actions Backend — Reference

## Backend Comparison Matrix

| Feature | TinyFish | DDGS | Custom |
|---------|----------|------|--------|
| Search | ✅ Volltext | ✅ Basic | ? vendor-dependent |
| Fetch (HTTP GET) | ✅ Mit JS-Rendering | ❌ Nein | ? |
| Browser Automation | ✅ Voll (Navigate, Click, Screenshot) | ❌ Nein | ? |
| Auth | X-API-Key header | Keine | Header/Token |
| Rate Limit | Quota-basiert (Provider) | Unbekannt (Rate-limited) | Selbst definiert |
| Cost | Bezahlt/Quota | Free | — |
| Latency (p50) | ~300ms | ~800ms | Variabel |

## TinyFish API Spezifikation ( Details )

### Base URL
```
https://api.search.tinyfish.ai
```

### Authentication
Header: `X-API-Key: sk-tinyfish-...`
 Alle Requests müssen diesen Header enthalten. Keine Query-Param-Auth.

### Endpoints

#### 1. Search
```
GET /v1/search?query=<urlencoded>&limit=<1-20>
```
Response:
```json
{
  "query": "string",
  "results": [
    {
      "position": 1,
      "site_name": "example.com",
      "title": "Page Title",
      "snippet": "Description...",
      "url": "https://..."
    }
  ],
  "total_results": 10,
  "page": 0
}
```

#### 2. Fetch
```
GET /v1/fetch?url=<urlencoded>&render_js=<true|false>
```
Parameter:
- `render_js=true` → Seite mit Headless Chromium rendern (wie Puppeteer)
- `render_js=false` → Nur HTML abrufen (schneller)

Response:
```json
{
  "url": "https://...",
  "status": 200,
  "content_type": "text/html",
  "html": "...",           // wenn render_js=false
  "screenshot": "data:image/png;base64,..."  // wenn render_js=true & screenshot=true
}
```

#### 3. Browser (Chromium Automation)
```
POST /v1/browser/navigate
{
  "url": "https://...",
  "wait_for_selector": "body",    // optional
  "screenshot": true,
  "timeout_ms": 30000
}
```
Weitere Browser-Aktionen: `click`, `type`, `screenshot`, `evaluate`.

### Error Responses
```json
{
  "error": {
    "code": "invalid_api_key | quota_exceeded | rate_limited | bad_request",
    "message": "Human readable description"
  }
}
```

### Rate Limits & Quotas
- Standard-Tier: 1000 Requests/Tag (konsultiere Dashboard für aktuelle Limits)
- Rate-Limit-Header in Response: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Bei `429 Too Many Requests`: Retry mit Exponential Backoff (2s → 4s → 8s)

## DDGS (DuckDuckGo Search) – Free Alternative

Installation:
```bash
pip install duckduckgo_search
```

Hermes konfigurieren:
```bash
hermes config set web.backend ddgs
hermes config set web.search_backend ddgs
```

Verwendung in Python-Code (falls direkter Zugriff nötig):
```python
from duckduckgo_search import DDGS

with DDGS() as ddgs:
    results = [r for r in ddgs.text("Hermes Agent", max_results=10)]
    # results: [{'title':..., 'href':..., 'body':...}, ...]
```

**Limitationen:**
- Kein Fetch mit JS-Rendering
- Kein Browser-Automation
- Unzuverlässig bei hohem Volumen (IP-spezifische Rate Limits)

## Custom Endpoint-Beispiel (OpenAI-kompatible Search)

Wenn ein selbst gehosteter Search-Service existiert, der OpenAI-API-Format spricht:

```yaml
web:
  backend: custom
  custom:
    base_url: http://localhost:8000/v1
    api_key: ${CUSTOM_SEARCH_KEY}
    headers:
      X-Custom-Header: value
    timeout_seconds: 30
```

Expected Response-Format (muss zu Hermes' Erwartungen passen):
```json
{
  "results": [
    {"title": "...", "url": "...", "snippet": "..."}
  ]
}
```

## Troubleshooting Log-Patterns

| Symptom | Mögliche Ursache | Log-Pattern | Fix |
|---------|------------------|-------------|-----|
| `401 Unauthorized` | `TINYFISH_API_KEY` fehlt/falsch | `"status":401,"error":"invalid_api_key"` | Key in `~/.hermes/.env` setzen, Session reset |
| `403 Quota exceeded` | Limit erreicht | `"error":"quota_exceeded"` | Auf DDGS umschalten, bis Quota resettet |
| `Timeout` | Netzwerk/Proxy | `ReadTimeoutError` | `http_proxy`/`https_proxy` prüfen, ggf. ausschalten |
| Keine Ergebnisse | Query zu spezifisch | Empty `results[]` | Query allgemeiner formulieren |
| `ModuleNotFoundError: duckduckgo_search` | DDGS nicht installiert | `"No module named 'duckduckgo_search'"` | `pip install duckduckgo_search` |

## Performance-Optimierung

- Bei Massen-Search: Batch-Größe auf 5–10 Anfragen begrenzen, dann Pause von 1–2s einlegen
- Für Seiten-Screenshots: `render_js=true` nur bei Bedarf (teuer); stattdessen `screenshot=true` ohne Render verwenden, wenn die Seite statisch ist
- Caching: Hermes komprimiert Suchergebnisse automatisch im Session-Kontext — `web_cache_ttl` in `config.yaml` anpassen falls nötig

## Migration: Von DDGS zu TinyFish

1. API-Key beschaffen und in `~/.hermes/.env` eintragen
2. `hermes config set web.backend tinyfish`
3. `hermes config set web.search_backend tinyfish`
4. `hermes doctor` ausführen — soll "TinyFish API: reachable" anzeigen
5. Session neustarten (`/reset`)
6. Test: `hermes chat -q "Test-Suche: Hermes Agent GitHub"`

Bei Problemen: Logs prüfen (`grep tinyfish ~/.hermes/logs/*.log`), dann auf DDGS zurückfallen (`hermes config set web.backend ddgs`).
