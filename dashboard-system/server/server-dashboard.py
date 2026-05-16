#!/usr/bin/env python3
"""
Multi-Agent Dashboard v2 — Server Edition
Portierbare Version für 24/7 Server-Betrieb.
Keine Abhängigkeit von lokalen Hermes-Daten (state.db, auth.json).
Pfade relativ zum Repo-Root — funktioniert auf jedem Linux-Server.

Usage:
  python3 server/server-dashboard.py
  # Oder über deploy.sh (systemd)
"""
import json, os, subprocess, urllib.request, csv, io, hashlib, time, sqlite3
from pathlib import Path
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    allow_reuse_address = True
    daemon_threads = True


# ── Configuration ──────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent
DASHBOARD_DIR = REPO_ROOT / "dashboard"
SHARED_DIR = REPO_ROOT / "shared"
CONFIG_FILE = REPO_ROOT / "config.json"

HOSTNAME = os.uname().nodename

# Optional: n8n connection (only if running on same machine)
N8N_BASE = "http://localhost:5678"
N8N_REST = f"{N8N_BASE}/rest"
N8N_WORKFLOW_ID = "1zHhhqvq6dZZiqcc"
NICHES = ["Gebäck", "Gesundheit", "Produktivität", "Sport"]

# ── Load config.json (optional override) ──────────────
CONFIG = {}
if CONFIG_FILE.exists():
    try:
        CONFIG = json.loads(CONFIG_FILE.read_text())
        TS_IP_OVERRIDE = CONFIG.get("tailscale_ip", None)
        N8N_BASE = CONFIG.get("n8n_base", N8N_BASE)
        N8N_WORKFLOW_ID = CONFIG.get("n8n_workflow_id", N8N_WORKFLOW_ID)
        DASHBOARD_PORT = CONFIG.get("port", int(os.environ.get("DASHBOARD_PORT", 8383)))
        SERVER_NAME = CONFIG.get("server_name", HOSTNAME)
        AGENT_NAME = CONFIG.get("agent_name", "Jeff")
    except:
        pass
else:
    TS_IP_OVERRIDE = None
    DASHBOARD_PORT = int(os.environ.get("DASHBOARD_PORT", 8383))
    SERVER_NAME = HOSTNAME
    AGENT_NAME = "Jeff"


# ── Change-Detection Cache (for SSE) ──────────────────
_snapshots = {}
def _changed(key, data):
    s = hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()
    if _snapshots.get(key) != s:
        _snapshots[key] = s
        return True
    return False


# ── Helpers ────────────────────────────────────────────
def json_resp(handler, data):
    handler.send_response(200)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(json.dumps(data).encode())

def html_resp(handler, content):
    handler.send_response(200)
    handler.send_header("Content-Type", "text/html; charset=utf-8")
    handler.end_headers()
    handler.wfile.write(content.encode())


# ── API: System Status ────────────────────────────────
def get_tailscale():
    """Check Tailscale — return hardcoded IP or try to detect."""
    if TS_IP_OVERRIDE:
        return {"status": "Connected", "ip": TS_IP_OVERRIDE, "account": "Julian's Server"}
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


def get_health():
    try:
        r = subprocess.run(["free", "-m"], capture_output=True, text=True, timeout=5)
        mem_lines = r.stdout.splitlines()
        mem = mem_lines[1].split() if len(mem_lines) > 1 else [0, 0, 0, 0]
        total_mem = int(mem[1]) if len(mem) > 1 else 0
        used_mem = int(mem[2]) if len(mem) > 2 else 0
        mem_pct = round(used_mem / total_mem * 100) if total_mem > 0 else 0

        r2 = subprocess.run(["df", "-h", "/"], capture_output=True, text=True, timeout=5)
        disk = r2.stdout.splitlines()
        disk_parts = disk[1].split() if len(disk) > 1 else ["", "", "", "", ""]
        disk_pct = int(disk_parts[4].replace("%", "")) if len(disk_parts) > 4 else 0

        r3 = subprocess.run(["uptime"], capture_output=True, text=True, timeout=5)
        uptime_str = r3.stdout.strip()

        r4 = subprocess.run(["ps", "aux"], capture_output=True, text=True, timeout=5)
        procs = len(r4.stdout.splitlines()) - 1

        return {
            "memory": {"total": total_mem, "used": used_mem, "pct": mem_pct,
                       "total_gb": round(total_mem / 1024, 1), "used_gb": round(used_mem / 1024, 1)},
            "disk": {"pct": disk_pct},
            "uptime": uptime_str[:60],
            "processes": procs,
            "cpu_load": uptime_str.split("load average:")[-1].strip() if "load average:" in uptime_str else "—",
        }
    except:
        return {"memory": {"total": 0, "used": 0, "pct": 0}, "disk": {"pct": 0},
                "uptime": "—", "processes": 0, "cpu_load": "—"}


# ── API: Tokens (from shared/file) ────────────────────
TOKENS_FILE = SHARED_DIR / "tokens" / "usage.json"
def get_token_data():
    if TOKENS_FILE.exists():
        try:
            return json.loads(TOKENS_FILE.read_text())
        except:
            pass
    return {"openrouter": None, "nous": None}


# ── API: Diary ────────────────────────────────────────
DIARY_FILE = SHARED_DIR / "diary.json"
def get_diary(limit=5):
    try:
        entries = json.loads(DIARY_FILE.read_text())
        return sorted(entries, key=lambda e: e.get("date", ""), reverse=True)[:limit]
    except:
        return []


# ── API: Activity (from shared/logs or defaults) ──────
def get_activity():
    log_dir = SHARED_DIR / "logs"
    activities = []
    if log_dir.exists():
        logs = sorted(log_dir.glob("*.log"), key=os.path.getmtime, reverse=True)[:3]
        for logf in logs:
            lines = logf.read_text().splitlines()[-30:]
            for l in lines:
                if any(x in l.lower() for x in ["token", "call", "request", "response", "error", "complete", "run"]):
                    ts = logf.stem[:16] if logf.stem else datetime.now().strftime("%H:%M")
                    activities.append({"time": ts, "source": logf.name, "message": l.strip()[:120]})
    if not activities:
        now = datetime.now()
        activities = [
            {"time": now.strftime("%H:%M"), "source": "system", "message": f"✅ {AGENT_NAME} Dashboard gestartet"},
            {"time": (now - timedelta(minutes=1)).strftime("%H:%M"), "source": "system",
             "message": f"✅ Server: {SERVER_NAME} (24/7)"},
        ]
    return activities[:20]


# ── API: Tasks (from shared/tasks.json) ───────────────
TASKS_FILE = SHARED_DIR / "tasks.json"
def get_tasks():
    if TASKS_FILE.exists():
        return json.loads(TASKS_FILE.read_text())
    return [
        {"id": 1, "title": "Dashboard Server aufgesetzt", "status": "completed",
         "agent": "system", "priority": "high",
         "created": datetime.now().strftime("%Y-%m-%d %H:%M"),
         "description": f"Server '{SERVER_NAME}' — 24/7 Dashboard"},
    ]


# ── API: Projects / Calendar (static defaults) ────────
def get_projects():
    total = 0
    daily = 0
    token_data = get_token_data()
    if token_data.get("openrouter"):
        total = token_data["openrouter"].get("total", 0)
        daily = token_data["openrouter"].get("daily", 0)

    return [
        {"name": "Dashboard Server", "total": round(total * 0.3, 2), "daily": round(daily * 0.3, 2),
         "calls": 0, "color": "#0071e3"},
        {"name": "Nolea Shop", "total": round(total * 0.25, 2), "daily": round(daily * 0.2, 2),
         "calls": 0, "color": "#af52de"},
    ]


def get_calendar():
    return []


# ── API: n8n Pipeline ────────────────────────────────
def get_n8n_workflow():
    try:
        req = urllib.request.Request(f"{N8N_REST}/workflows/{N8N_WORKFLOW_ID}")
        with urllib.request.urlopen(req, timeout=8) as r:
            w = json.loads(r.read())
            if "data" in w:
                w = w["data"]
            return {"active": w.get("active", False), "name": w.get("name", "?"),
                    "updated": w.get("updatedAt", "?"), "nodes_raw": w.get("nodes", [])}
    except Exception as e:
        return {"active": False, "name": "Nolea Produkt und Content",
                "error": str(e)[:60], "nodes_raw": []}


def get_n8n_executions():
    try:
        req = urllib.request.Request(
            f"{N8N_REST}/executions?workflowId={N8N_WORKFLOW_ID}&status=running&limit=3")
        with urllib.request.urlopen(req, timeout=5) as r:
            d = json.loads(r.read())
            if "data" in d:
                d = d["data"]
            if isinstance(d, list) and len(d) > 0:
                e = d[0]
                return {"running": True, "id": e.get("id", "?"),
                        "started": e.get("startedAt", "?")[:19]}
    except:
        pass
    return {"running": False}


def get_pipeline():
    wf = get_n8n_workflow()
    execution = get_n8n_executions()
    all_nodes = wf.get("nodes_raw", [])
    is_running = execution.get("running", False)
    status = "running" if is_running else "idle"

    pipeline = []
    for i, niche in enumerate(NICHES):
        niche_nodes = [n for n in all_nodes if niche in n.get("name", "") and "Config" not in n.get("name", "")]
        phases = [
            {"id": "research", "name": "🔍 Recherche", "icon": "🔍",
             "nodes": [n for n in niche_nodes if any(x in n.get("name", "") for x in
                       ["Reddit", "Subreddit", "Google News", "Extra Quellen", "gutefrage",
                        "TikTok Search", "Facebook Search", "Instagram Search", "Comments"])]},
            {"id": "analysis", "name": "📊 Analyse", "icon": "📊",
             "nodes": [n for n in niche_nodes if any(x in n.get("name", "") for x in ["Gap Analyzer", "Price Scanner"])]},
            {"id": "content", "name": "✍️ Content", "icon": "✍️",
             "nodes": [n for n in niche_nodes if any(x in n.get("name", "") for x in
                       ["AI Konzept", "Konzept:", "HTML+Caption", "SEO Blog", "Blog→File", "Slide Prompts"])]},
            {"id": "output", "name": "📦 Output", "icon": "📦",
             "nodes": [n for n in niche_nodes if any(x in n.get("name", "") for x in ["HTTP PDF", "HTML→PDF", "Save to Memory"])]},
            {"id": "telegram", "name": "🤖 Telegram", "icon": "🤖",
             "nodes": [n for n in niche_nodes if any(x in n.get("name", "") for x in
                       ["TG Text:", "TG PDF:", "TG Prompts:", "TG Gap Report:", "TG Blog:"])]},
        ]
        products = []
        for p in phases:
            st = "pending"
            if is_running and i == 0:
                st = "active"
            products.append({"phase": p["id"], "name": p["name"], "icon": p["icon"],
                             "nodes": [{"name": n.get("name", "?")} for n in p["nodes"]],
                             "count": len(p["nodes"]), "status": st})
        pipeline.append({"niche": niche, "products": products, "total_nodes": len(niche_nodes),
                         "active": is_running and i == 0})

    shared_nodes = [n for n in all_nodes if "Uhr" in n.get("name", "")]
    return {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "niches": pipeline,
        "shared_nodes": len(shared_nodes),
        "workflow": {"active": wf.get("active"), "name": wf.get("name", "?"),
                     "total": len(all_nodes), "published": wf.get("active", False)},
        "execution": execution,
        "workflow_status": status
    }


# ── Diary Stats & Goals (from shared/) ───────────────
DIARY_STATS_FILE = SHARED_DIR / "diary-stats.json"
DIARY_GOALS_FILE = SHARED_DIR / "diary-goals.json"


# ── HTTP Handler ──────────────────────────────────────
class Handler(BaseHTTPRequestHandler):

    def do_GET(self):
        try:
            path = self.path.split("?")[0]  # strip query params

            # ── SSE Endpoint ──
            if path == "/api/events":
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Connection", "keep-alive")
                self.end_headers()

                def sse(event, data):
                    self.wfile.write(f"event: {event}\ndata: {json.dumps(data)}\n\n".encode())
                    self.wfile.flush()

                sse("system", {"host": SERVER_NAME, "agent": AGENT_NAME,
                     "time": datetime.now().strftime("%Y-%m-%d %H:%M"),
                     "uptime": subprocess.run(["uptime", "-p"], capture_output=True, text=True, timeout=3)
                     .stdout.strip().replace("up ", "")})
                sse("tailscale", get_tailscale())
                sse("tokens", get_token_data())
                sse("processes", {"dashboard": "Running", "server": SERVER_NAME})

                while True:
                    time.sleep(5)
                    now = datetime.now().strftime("%Y-%m-%d %H:%M")
                    up = subprocess.run(["uptime", "-p"], capture_output=True, text=True, timeout=3) \
                        .stdout.strip().replace("up ", "")
                    if _changed("system", {"host": SERVER_NAME, "time": now, "uptime": up}):
                        sse("system", {"host": SERVER_NAME, "time": now, "uptime": up})
                    ts = get_tailscale()
                    if _changed("tailscale", ts):
                        sse("tailscale", ts)
                return

            # ── REST APIs ──
            if path == "/api/status":
                token_data = get_token_data()
                json_resp(self, {
                    "host": SERVER_NAME, "agent": AGENT_NAME,
                    "time": datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "uptime": subprocess.run(["uptime", "-p"], capture_output=True, text=True, timeout=3)
                    .stdout.strip().replace("up ", ""),
                    "tailscale": get_tailscale(),
                    "tokens": token_data,
                    "processes": {"dashboard": "Running", "server": SERVER_NAME},
                    "mode": "server"  # distinguishes from local dashboard
                })

            elif path == "/api/tokens":
                json_resp(self, get_token_data())

            elif path == "/api/sub-agents":
                json_resp(self, [])

            elif path == "/api/activity":
                json_resp(self, get_activity())

            elif path == "/api/health":
                json_resp(self, get_health())

            elif path == "/api/tasks":
                json_resp(self, get_tasks())

            elif path == "/api/projects":
                json_resp(self, get_projects())

            elif path == "/api/calendar":
                json_resp(self, get_calendar())

            elif path == "/api/diary":
                try:
                    limit = 5
                    qs = self.path.split("?")[1] if "?" in self.path else ""
                    if "limit=" in qs:
                        limit = int(qs.split("limit=")[1].split("&")[0])
                except:
                    limit = 5
                json_resp(self, get_diary(limit))

            elif path == "/api/diary/today":
                try:
                    entries = json.loads(DIARY_FILE.read_text()) if DIARY_FILE.exists() else []
                    if entries:
                        sorted_e = sorted(entries, key=lambda e: e.get("date", ""), reverse=True)
                        json_resp(self, sorted_e[0])
                    else:
                        json_resp(self, {})
                except:
                    json_resp(self, {})

            elif path == "/api/diary/stats":
                if DIARY_STATS_FILE.exists():
                    json_resp(self, json.loads(DIARY_STATS_FILE.read_text()))
                else:
                    json_resp(self, {})

            elif path == "/api/diary/goals":
                if DIARY_GOALS_FILE.exists():
                    json_resp(self, json.loads(DIARY_GOALS_FILE.read_text()))
                else:
                    json_resp(self, [])

            elif path == "/api/diary/notify":
                json_resp(self, {"status": "notification_configured",
                                 "message": "Diary on Julian's Server"})

            elif path == "/api/pipeline":
                json_resp(self, get_pipeline())

            elif path.startswith("/api/export/tokens"):
                token_data = get_token_data()
                or_u = token_data.get("openrouter", {})
                buf = io.StringIO()
                w = csv.writer(buf)
                w.writerow(["Metric", "Value"])
                w.writerow(["Total", f"${or_u.get('total', 0):.2f}"])
                w.writerow(["Daily", f"${or_u.get('daily', 0):.2f}"])
                self.send_response(200)
                self.send_header("Content-Type", "text/csv")
                self.send_header("Content-Disposition",
                                 f'attachment; filename="token-usage-{datetime.now().strftime("%Y%m%d")}.csv"')
                self.end_headers()
                self.wfile.write(buf.getvalue().encode())

            # ── Static Pages ──
            elif path in ["/activity", "/health", "/tasks", "/calendar", "/pipeline", "/diary"]:
                page_name = path.lstrip("/")
                page = DASHBOARD_DIR / f"{page_name}.html"
                if page.exists():
                    html_resp(self, page.read_text(encoding="utf-8"))
                else:
                    html_resp(self, f"<h1>Page {page_name} not found</h1>")

            elif path == "/tokens":
                tokens_file = DASHBOARD_DIR / "tokens.html"
                html_resp(self, tokens_file.read_text(encoding="utf-8") if tokens_file.exists()
                          else "<h1>File not found</h1>")

            else:
                # Dashboard index.html
                index = DASHBOARD_DIR / "index.html"
                html_resp(self, index.read_text(encoding="utf-8") if index.exists()
                          else "<h1>Dashboard not found</h1>")

        except Exception as e:
            self.send_error(500, str(e))

    def do_POST(self):
        if self.path == "/api/diary/goals":
            try:
                length = int(self.headers.get("content-length", 0))
                body = json.loads(self.rfile.read(length).decode()) if length else {}
                goals = body.get("goals", [])
                DIARY_GOALS_FILE.parent.mkdir(parents=True, exist_ok=True)
                DIARY_GOALS_FILE.write_text(json.dumps(goals, indent=2))
                json_resp(self, {"status": "ok", "goals": goals})
            except Exception as e:
                json_resp(self, {"status": "error", "message": str(e)})
        else:
            self.send_error(404)

    def log_message(self, fmt, *args):
        pass


# ── Main ──────────────────────────────────────────────
if __name__ == "__main__":
    port = DASHBOARD_PORT
    print(f"🌐 {AGENT_NAME} Dashboard — Server Edition")
    print(f"   Host:  {SERVER_NAME}")
    print(f"   URL:   http://localhost:{port}")
    print(f"   Pages: / → Dashboard  /tokens → Tokens  /diary → Tagebuch")
    print(f"          /activity  /health  /tasks  /calendar  /pipeline")
    print(f"   APIs:  /api/status  /api/tokens  /api/diary  /api/health")
    print(f"   Dir:   {REPO_ROOT}")
    print(f"   Data:  {SHARED_DIR}")
    ThreadedHTTPServer(("0.0.0.0", port), Handler).serve_forever()
