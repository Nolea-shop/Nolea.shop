# Market-Research-to-Product Bot — Concrete Implementation

**Status**: In progress (Node 2 of ~18 planned)
**Workflow ID**: `uzKjEgkIaOTmTIJw`
**Owner**: Damian
**Session started**: 2026-05-03

## Planned Node Architecture

| # | Node Type | Function |
|---|-----------|----------|
| 1 | Schedule Trigger | Daily 08:00 Europe/Berlin |
| 2 | HTTP Request (Reddit) | Reddit OAuth2 API — search ungelöste Probleme |
| 3 | Code (JS) | Parse + gruppiere Top-Problem-Posts |
| 4 | HTTP Request (Reddit Comments) | Top-Kommentare pro Post laden |
| 5 | Code (JS) | Comments flattenen |
| 6 | AI Node (minimax) | Lückenanalyse: Angebot vs. Nachfrage |
| 7 | Code (JS) | Produkt-Konzept aus Analyse |
| 8 | Code (JS) | PDF-HTML erzeugen |
| 9 | HTTP Request | HTML→PDF via freie API |
| 10 | Code (JS) | PDF als Binary |
| 11 | HTTP Request (Vercel) | PDF upload to Vercel Blob |
| 12 | Code (JS) | Metadaten + Vercel-URL |
| 13 | AI Node (minimax) | 3x Marketing-Caption prompts |
| 14-16 | HTTP Request (Pollinations.ai) | 3x Marketing-Bilder generieren |
| 17 | Code (JS) | Bild-URLs sammeln |
| 18 | HTTP Request (Reddit) | Reddit Post mit Produktlink |
| 19 | Telegram | Zusammenfassung an Damian |

## Current State (as of 2026-05-03)

### Node 1: Daily Schedule — COMPLETE
- Type: `n8n-nodes-base.scheduleTrigger`, typeVersion 1.1
- Cron: `0 8 * * *` (08:00 Berlin)
- Timezone setting: `Europe/Berlin` in workflow settings

### Node 2: Reddit Search — BLOCKED
- URL: `https://oauth.reddit.com/search`
- OAuth2 credential: `redditOAuth2Api` (ID: `ynUrtWfZbFtFZM2D`)
- Query: `q=glutenfrei`, `sort=new`, `limit=10`
- User-Agent: `n8n-research-bot-v1.0 (by /u/dein_reddit_name)`
- **Status**: Awaiting real OAuth2 token in credential
- Reddit blocks Docker IPs; OAuth2 Bearer token must be valid

## Configuration Notes

### Schedule Trigger Timezone
Workflow settings must include:
```json
{
  "settings": {
    "timezone": "Europe/Berlin"
  }
}
```

### Reddit OAuth2 Credential
Create via API (credential type = `redditOAuth2Api`):
```python
new_cred = {
    "name": "Reddit OAuth2",
    "type": "redditOAuth2Api",
    "data": {"accessToken": "REAL_TOKEN_HERE"}
}
```

### Pollinations.ai (Image Generation)
No API key needed. Free HTTP GET:
```
GET https://image.pollinations.ai/prompt/{url_encoded_prompt}
```
Returns PNG directly. Use n8n HTTP Request with `responseFormat: file`.

### Vercel Blob Upload
Placeholder Bearer token in HTTP Request header. Replace with real token before activation.
