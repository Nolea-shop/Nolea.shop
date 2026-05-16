# Server Edition Architecture

When creating a portable server edition of a local service, follow this architecture:

## Path Resolution

```python
from pathlib import Path

# Absolute: resolve relative to the script's location
REPO_ROOT = Path(__file__).resolve().parent.parent
DASHBOARD_DIR = REPO_ROOT / "dashboard"    # static HTML
SHARED_DIR = REPO_ROOT / "shared"          # live data
CONFIG_FILE = REPO_ROOT / "config.json"    # server-specific overrides
```

## Config Overlay (config.json)

```python
CONFIG = {}
if CONFIG_FILE.exists():
    try:
        CONFIG = json.loads(CONFIG_FILE.read_text())
        PORT = CONFIG.get("port", 8383)
        SERVER_NAME = CONFIG.get("server_name", HOSTNAME)
        TS_IP_OVERRIDE = CONFIG.get("tailscale_ip", None)
    except:
        pass
```

**config.example.json:**
```json
{
  "server_name": "julian-server",
  "agent_name": "Jeff",
  "port": 8383,
  "tailscale_ip": "100.x.x.x",
  "n8n_base": "http://localhost:5678",
  "n8n_workflow_id": "1zHhhqvq6dZZiqcc"
}
```

## Graceful Fallback Pattern

Every feature that depends on local-only data must wrap in try/except:

```python
# Hermes state.db → not available on server
def get_diary(limit=5):
    try:
        entries = json.loads(DIARY_FILE.read_text())
        return sorted(entries, key=lambda e: e.get("date", ""), reverse=True)[:limit]
    except:
        return []  # silent fallback to empty

# Local auth.json → not available on server
def get_token_data():
    if TOKENS_FILE.exists():
        try: return json.loads(TOKENS_FILE.read_text())
        except: pass
    return {"openrouter": None, "nous": None}

# Local log files → not available on server
def get_activity():
    activities = []
    if log_dir.exists():
        ...  # try to read logs
    if not activities:
        return [{"time": now, "source": "system", "message": "Server gestartet"}]
```

## Tailscale Detection

Try to detect at runtime, fall back to config.json:

```python
def get_tailscale():
    if TS_IP_OVERRIDE:
        return {"status": "Connected", "ip": TS_IP_OVERRIDE, "account": "Server"}
    try:
        ts_bin = os.path.expanduser("~/.local/bin/tailscale")
        ts_sock = os.path.expanduser("~/.local/share/tailscale/tailscaled.sock")
        if os.path.exists(ts_bin):
            r = subprocess.run([ts_bin, f"--socket={ts_sock}", "status"],
                               capture_output=True, text=True, timeout=5)
            for line in r.stdout.split("\n"):
                line = line.strip()
                if line and not line.startswith("#"):
                    parts = line.split()
                    if len(parts) >= 3 and parts[1] != "-":
                        return {"status": "Connected", "ip": parts[0], "account": parts[2]}
        return {"status": "Disconnected", "ip": "—", "account": "—"}
    except:
        return {"status": "Offline", "ip": "—", "account": "—"}
```

## .gitignore

```
config.json           # server-specific IPs/ports
!config.example.json
shared/diary*.json    # live data
shared/tokens/
shared/tasks.json
shared/logs/
__pycache__/
*.pyc
.env
```

## Checklist

- [ ] All hardcoded paths replaced with `REPO_ROOT`-relative
- [ ] Every Hermes-specific feature has try/except fallback
- [ ] `config.json` not tracked in git
- [ ] `config.example.json` tracked with placeholder values
- [ ] deploy.sh references the server script, not the local one
- [ ] systemd service has `WorkingDirectory=$REPO_DIR`
- [ ] Port documented in README
- [ ] n8n workflows exported to `n8n/`