# Reddit API Docker IP Block — 2026-05-03 Session

## Symptom
n8n HTTP Request Node configured with:
- URL: `https://www.reddit.com/search.json`
- Method: GET
- Headers: `User-Agent: n8n-research-bot-v1.0 (by /u/dein_reddit_name)`
- Params: `q=glutenfrei`, `sort=new`, `limit=10`

Result: `{"kind":"Listing","data":{"dist":0,"children":[]}}` — empty response.

## Root Cause
Reddit blocks IP ranges belonging to cloud providers (AWS, GCP, Docker, etc.). The same request fired from WSL terminal returns 10 posts with identical headers and URL.

## Verification
```bash
# Works from WSL terminal (real IP)
curl -s -H "User-Agent: n8n-research-bot-v1.0 (by /u/dein_reddit_name)" \
  "https://www.reddit.com/search.json?q=glutenfrei&sort=new&limit=3"
# Returns: dist:10, children:[...] — WORKS

# Same from Docker container — blocked
docker run --rm curlimages/curl:latest -s \
  -H "User-Agent: n8n-research-bot-v1.0 (by /u/dein_reddit_name)" \
  "https://www.reddit.com/search.json?q=glutenfrei&sort=new&limit=3"
# Returns: dist:0, children:[] — BLOCKED
```

## Workarounds
1. **Switch to Hacker News API** — no IP restrictions, returns real-time data
   - Endpoint: `https://hn.algolia.com/api/v1/search?query=problem&tags=story`
2. **Use Reddit OAuth2 with a residential proxy** — proxy the request through a residential exit node
3. **Run n8n natively (npx) instead of Docker** — npx binds to the host network, bypassing cloud IP ranges
4. **Reddit JSONP workaround** — some endpoints support JSONP which may bypass the block (limited utility)

## Session Context
- n8n running in Docker on Damia's Windows machine
- Workflow: "Market-Research-to-Product" bot
- Reddit Search was Node 2 in the planned pipeline
