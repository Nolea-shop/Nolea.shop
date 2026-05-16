---
name: self-hosted-deployment
title: Self-Hosted Deployment
description: Prepare local services for deployment on a remote 24/7 server. Package in git repo, create portable server edition with relative paths, graceful fallbacks for dev-only features, deploy.sh with systemd.
tags: [deployment, server, systemd, migration, devops]
version: 1.0
---

# Self-Hosted Deployment

Prepare a local service (Python HTTP server, Node app, etc.) for deployment on a remote 24/7 server while keeping the local dev setup running unchanged.

## Workflow

### 1. Inventory — What's Running?

```bash
ps aux | grep -E 'python|node|n8n|dashboard' | grep -v grep
```

Identify:
- **Server processes** (Python HTTP servers, Node apps)
- **Databases** (SQLite files, n8n DB)
- **Static files** (HTML, CSS, JS)
- **Config files** (auth.json, config.yaml)
- **Cron jobs** (hermes cronjob list)
- **Ports** (netstat -tlnp or ss -tlnp)

### 2. Package in Git Repo

```bash
mkdir -p ~/multi-agent-dashboard/{dashboard,server,shared,n8n,scripts,configs}
cd ~/multi-agent-dashboard
git init
```

Copy all source files into the repo. Keep the original location untouched.

### 3. Create a Portable Server Edition

The local version likely has hardcoded paths (e.g. `/mnt/d/hermes/multi-agent`). Create a parallel `server-*.py` that uses **relative paths**:

```python
REPO_ROOT = Path(__file__).resolve().parent.parent
DASHBOARD_DIR = REPO_ROOT / "dashboard"
SHARED_DIR = REPO_ROOT / "shared"
```

**Graceful fallbacks for dev-only features:**
- Hermes `state.db` → return empty diary/sessions
- Local `auth.json` → return empty token data
- Local log files → return default activity entries
- Tailscale → try to detect, fall back to config.json override

**config.json overlay pattern:**

```python
CONFIG_FILE = REPO_ROOT / "config.json"
CONFIG = {}
if CONFIG_FILE.exists():
    CONFIG = json.loads(CONFIG_FILE.read_text())
    PORT = CONFIG.get("port", 8383)
    SERVER_NAME = CONFIG.get("server_name", HOSTNAME)
```

### 4. Export n8n Workflows

If n8n API requires auth (cookie-based), export via SQLite:

```python
import json, sqlite3
db = sqlite3.connect("~/.n8n/database.sqlite")
db.row_factory = sqlite3.Row
rows = db.execute("SELECT id, name, active, nodes, connections, settings, staticData, createdAt, updatedAt FROM workflow_entity").fetchall()
for row in rows:
    wf = dict(row)
    for field in ["nodes", "connections", "settings", "staticData"]:
        if isinstance(wf.get(field), str):
            wf[field] = json.loads(wf[field])
    # Save as JSON
```

Save to `n8n/` directory in the repo.

### 5. Write deploy.sh

The deploy script should:

```bash
#!/usr/bin/env bash
set -e
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

# 1. System dependencies
apt-get install -y python3 python3-pip curl jq ufw

# 2. Create shared directories
mkdir -p "$REPO_DIR/shared/tokens" "$REPO_DIR/shared/logs"

# 3. Open firewall port
ufw allow 8383/tcp

# 4. Create systemd service
cat > /etc/systemd/system/multi-agent-dashboard.service << SERVICE
[Unit]
Description=Multi-Agent Dashboard Server
After=network.target tailscaled.service

[Service]
Type=simple
User=root
WorkingDirectory=$REPO_DIR
ExecStart=/usr/bin/python3 $REPO_DIR/server/server-dashboard.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable multi-agent-dashboard
systemctl restart multi-agent-dashboard

# 5. Health check
sleep 3
curl -sf http://localhost:8383/api/status
```

**Key elements:**
- `set -e` — fail on first error
- `WorkingDirectory=$REPO_DIR` — so relative paths work
- `Restart=always` — 24/7 uptime
- Health check after start
- Tailscale IP detection for access URL

### 6. README with Access Info

Document:
- Local URL: `http://localhost:8383`
- Server URL: `http://<tailscale-ip>:8383`
- Update: `cd /opt/multi-agent-dashboard && git pull && systemctl restart multi-agent-dashboard`
- Logs: `journalctl -u multi-agent-dashboard -f`

## Pitfalls

### Hardcoded paths in original server
The local version likely has `BASE = Path("/mnt/d/...")` or similar. The server version MUST use relative paths. Search for all absolute path references before creating the server edition.

### Hermes-specific features won't work on server
- `state.db` (Hermes session DB) — not available on server
- `auth.json` (OpenRouter/Nous tokens) — not available on server
- `~/.hermes/logs/` — not available on server
- **Fix:** Wrap in try/except, return empty defaults

### n8n API auth
Local n8n often uses cookie-based auth (no API key). REST API returns 401. Use SQLite export instead.

### Fine-Grained GitHub PAT permissions
Fine-Grained tokens need explicit repo access. If `gh repo create` fails with 403, the user needs to:
1. Create the repo manually on GitHub.com (empty, no README)
2. Or grant the token "Contents: Read & Write" + "Administration: Read & Write" permissions

### Tailscale IP detection
`tailscale status` output format varies. Parse carefully:
```bash
tailscale status | awk '/^[0-9]/{print $1; exit}'
```

### systemd service as root vs user
If the service runs as root, `Path.home()` returns `/root/`, not the user's home. Use explicit paths or `$REPO_DIR`.

## Related Skills
- `n8n-api-control` — n8n workflow export/import
- `dashboard-tagebuch` — diary system (example of a deployed service)