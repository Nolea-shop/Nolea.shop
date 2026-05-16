# n8n First Start on WSL2 — Real Session Notes

## Environment (2026-05-01)
- WSL2, Windows 10/11
- Node.js v22.22.2, npm 10.9.7
- Docker: NOT installed
- n8n version downloaded: 2.18.5

## Timeline

| Time | Event |
|---|---|
| T+0s | `npx n8n start` issued |
| T+0-60s | npm download phase — no HTTP response yet, 2 npm exec processes visible |
| T+60-90s | Peer dependency warnings in log (zod, @langchain/core conflicts) — normal |
| T+90-150s | TypeScript compilation / build phase |
| T+150-180s | `Editor ready`, HTTP 200 on :5678 |

## Key Observations

1. **Two npm exec processes are normal** — npx spawns a wrapper + the actual n8n process.
2. **Do not kill processes that look "stuck"** during the first 2 minutes — they are downloading/compiling.
3. **Peer dependency warnings are harmless** for local dev. n8n ships with bundled deps that override peer ranges.
4. **First-run shows owner setup form** — not the workflow list. Account creation comes before any workflow work.
5. **Ready check must use long timeout** — 30s is NOT enough. Use 5min poll with 5-10s intervals.

## Commands Used

```bash
# Start
N8N_BASIC_AUTH_ACTIVE=false N8N_SECURE_COOKIE=false npx n8n start > /tmp/n8n.log 2>&1 &

# Check readiness
curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/

# Check processes
ps aux | grep "[n]8n"

# Check log
tail -30 /tmp/n8n.log
```
