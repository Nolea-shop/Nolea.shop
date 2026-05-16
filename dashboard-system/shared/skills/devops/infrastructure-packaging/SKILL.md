---
name: infrastructure-packaging
title: Infrastructure Packaging for Remote Deployment
description: Package a locally-running multi-service stack into a self-contained Git repo with deploy.sh, systemd service, and configurable paths — ready for a remote 24/7 server.
version: 1.0
---

# Infrastructure Packaging for Remote Deployment

Packaging a local dev stack (dashboard server, n8n, shared data) into a portable deployable repo. The stack keeps running locally while a deployable mirror is prepared for a remote 24/7 server.

## When to use

- User has a local multi-service stack (Python HTTP server, n8n, cron jobs, static files) running on WSL or a dev machine
- Wants to deploy it on a remote 24/7 server (colleague's machine, VPS, etc.) without disrupting local operation
- Both local and remote should remain accessible (via Tailscale or VPN)
- User suggests or agrees to a Git repo approach

## Workflow

### 1. Analyse the current stack

Identify all components:

- **Processes:** `ps aux | grep -E 'python|node|n8n|dashboard' | grep -v grep`
- **Ports:** Dashboard, n8n, STT, any other services
- **Files:** HTML pages, server scripts, configs, shared data files
- **Paths:** Are they hardcoded to WSL paths like `/mnt/d/...` or `~/.hermes/`?
- **Startup scripts:** `start-dashboard.sh`, `~/.bashrc` hooks, aliases
- **Cron jobs:** `cronjob` management (list with cronjob action='list')
- **Skills involved:** Load `dashboard-tagebuch` etc. for reference

### 2. Determine the access layer

- **Tailscale:** Check `tailscale status` — if both machines are in the same Tailnet, they reach each other via Tailscale IP
- **SSH:** If no Tailscale, SSH port forwarding
- **Config:** Create `config.example.json` with overridable fields like `tailscale_ip`, `port`, `server_name`, `n8n_base`

### 3. Create the repo structure

```
multi-service-name/
├── dashboard/           # Static HTML/CSS/JS frontend files (all pages)
├── server/              # Python/Node server scripts
│   ├── server-local.py  # Original version (hardcoded paths — keep as-is)
│   └── server-deploy.py # Server version (relative paths, configurable)
├── scripts/             # Helper scripts, cron job scripts
├── configs/             # Agent configs, YAML, SSH templates
├── n8n/                 # Exported n8n workflows (JSON from DB)
├── shared/              # Runtime data directory (empty/example in repo)
├── config.example.json  # Template for server config
├── deploy.sh            # One-command setup for remote server
├── .gitignore           # Exclude live data (shared/diary*.json, tokens, logs)
└── README.md            # Full deployment guide
```

### 4. Build the server-compatible version

**What changes from local → server:**

| Local Feature | Server Fallback |
|---------------|-----------------|
| Hardcoded `/mnt/d/...` paths | Relative paths from `Path(__file__).resolve().parent.parent` |
| `~/.hermes/auth.json` (OpenRouter keys) | Return empty/None — not available |
| `~/.hermes/state.db` (Hermes sessions) | Return empty list |
| `~/.hermes/logs/*.log` | Read from `shared/logs/` or return defaults |
| Tailscale auto-detect | Allow override via `config.json` `tailscale_ip` |
| `HOSTNAME` | Allow override via `config.json` `server_name` |
| n8n `localhost:5678` | Keep as default, make configurable |

Server-compatible handlers should **never crash** on missing data — return graceful defaults.

### 5. Write deploy.sh

The deploy script for the remote machine must:

```bash
# Essential sequence:
1. Prüfen: sudo, richtiges Verzeichnis, Python vorhanden
2. System-Abhängigkeiten: python3, pip3, curl, jq, ufw
3. Shared-Verzeichnisse anlegen: mkdir -p shared/tokens shared/logs
4. Firewall: ufw allow <port>/tcp
5. systemd service anlegen (After=network.target)
6. systemctl enable + start
7. Health-Check: curl localhost:<port>/api/status
8. Tailscale-Info anzeigen (falls vorhanden)
9. Optional: n8n Installation (Node.js + npm install -g n8n + systemd)

# Key deploy.sh patterns:
systemctl daemon-reload
systemctl enable multi-agent-dashboard
systemctl restart multi-agent-dashboard

# Health check:
if curl -sf "http://localhost:$PORT/api/status" > /dev/null 2>&1; then
    echo "✅ Dashboard antwortet"
fi
```

### 6. Export service data

**n8n Workflows:** Export from SQLite (preferred — works when API is cookie-locked):

```python
import json, sqlite3
db = sqlite3.connect("~/.n8n/database.sqlite")
db.row_factory = sqlite3.Row
rows = db.execute("SELECT id, name, active, nodes, connections, settings, staticData, createdAt, updatedAt FROM workflow_entity").fetchall()
for row in rows:
    wf = dict(row)
    for field in ["nodes", "connections", "settings", "staticData"]:
        val = wf.get(field)
        if val and isinstance(val, str):
            try: wf[field] = json.loads(val)
            except: pass
    with open(f"n8n/{wf['name'].replace(' ', '-')}.json", "w") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False)
```

**Diary/Shared Data:** Leave placeholder files — live data stays local. Add rsync instructions in README.

### 7. Write README

Must include:
- Architecture diagram (local ↔ remote via Tailscale)
- Repo structure explanation
- Deployment steps for remote server
- Access URLs (local, remote, cross-access via Tailscale)
- Optional: data sync instructions (`rsync` from local to remote)

### 8. Keep local stack untouched

The entire process is non-disruptive:
- **Local files:** Don't modify any files in `/mnt/d/...`, `~/.hermes/`, or `~/.n8n/`
- **Local processes:** Don't stop or restart any running services
- **Startup scripts:** Don't modify `.bashrc` or `start-dashboard.sh`
- **Cron jobs:** Don't touch existing cron jobs
- **Cron jobs:** Don't touch existing cron jobs
- **The repo is a COPY with modifications** — all changes go into the repo directory

### Templates

- `templates/deploy.sh` — Generic deploy.sh template for systemd service setup
- `references/n8n-sqlite-export.md` — n8n workflow export via SQLite (reusable script + import instructions)

### 9. Git init + commit

```bash
git init
git add -A
git commit -m "Initial: ..."
```

Push later when user provides GitHub auth/token.

## Pitfalls

### Hardcoded absolute paths
Local development often uses absolute paths (`/mnt/d/hermes/multi-agent/`). These **must** become relative in the server version. Strategy: derive repo root from `Path(__file__).resolve().parent.parent`.

### Hermes-specific features won't exist on remote
The dashboard-server.py reads:
- `~/.hermes/auth.json` → OpenRouter/Nous token usage
- `~/.hermes/state.db` → Session messages (e.g. `/api/sessions/...`)
- `~/.hermes/logs/` → Activity feed
These are NOT available on the remote server. Server version must return graceful empty/defaults.

### n8n auth mismatch
- Local n8n might use cookie auth (no API key)
- Remote n8n setup can use API key or also cookie
- Export via SQLite is the most reliable cross-machine method

### .gitignore must exclude live data
Don't commit diary.json, diary-stats.json, tokens/usage.json, tasks.json, or logs. These are runtime data, not repo content.

### Systemd service must restart on failure
Always set `Restart=always` and `RestartSec=5` in the service file. The service may take a moment to start — don't set `RestartSec` too low.