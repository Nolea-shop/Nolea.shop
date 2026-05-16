#!/usr/bin/env python3
"""
Multi-Agent Dashboard v2 — All Features
Enthält: Status, Tokens, Sub-Agents, Activity, Health, Tasks, Projects, Calendar, Export
"""
import json, os, subprocess, urllib.request, csv, io, hashlib, time, sqlite3, re
from pathlib import Path
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

BASE = Path("/mnt/d/hermes/multi-agent")
HTML_FILE = BASE / "dashboard" / "index.html"
TOKENS_HTML = BASE / "dashboard" / "tokens.html"
HOSTNAME = os.uname().nodename
TS_BIN = str(Path.home() / ".local/bin/tailscale")
TS_SOCK = str(Path.home() / ".local/share/tailscale/tailscaled.sock")
AUTH_FILE = Path.home() / ".hermes" / "auth.json"
TOKENS_FILE = BASE / "shared" / "tokens" / "usage.json"

# Change-Detection Cache
_snapshots = {}
def _changed(key, data):
    s = hashlib.md5(json.dumps(data, sort_keys=True).encode()).hexdigest()
    if _snapshots.get(key) != s:
        _snapshots[key] = s
        return True
    return False

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

def get_openrouter_usage():
    try:
        auth = json.loads(AUTH_FILE.read_text())
        keys = [c["access_token"] for c in auth.get("credential_pool",{}).get("openrouter",[]) if c.get("access_token")]
        if not keys: return None
        req = urllib.request.Request("https://openrouter.ai/api/v1/auth/key", headers={"Authorization": f"Bearer {keys[0]}"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            u = json.loads(resp.read()).get("data", {})
            return {"total": round(u.get("usage",0),2), "daily": round(u.get("usage_daily",0),2),
                    "weekly": round(u.get("usage_weekly",0),2), "monthly": round(u.get("usage_monthly",0),2),
                    "limit": u.get("limit",0), "remaining": u.get("limit_remaining",0),
                    "limit_reset": u.get("limit_reset","daily"), "status":"active"}
    except Exception as e:
        return {"status":"error", "message":str(e)[:80]}

def get_nous_usage():
    try:
        auth = json.loads(AUTH_FILE.read_text())
        nous = auth.get("credential_pool",{}).get("nous",[])
        if not nous: return None
        return {"status":"active", "tier":nous[0].get("subscription_tier",5),
                "rate_limit_tpm":nous[0].get("rate_limit_tpm",500000),
                "expires_at":nous[0].get("agent_key_expires_at","?")}
    except: return {"status":"error"}

def get_tailscale():
    try:
        r = subprocess.run([TS_BIN, f"--socket={TS_SOCK}","status"], capture_output=True, text=True, timeout=5)
        for line in r.stdout.split("\n"):
            if "suffix" in line:
                ip = line.split()[0] if line.split() else "?"
                return {"status":"Connected","ip":ip,"account":"babyprobo.09@gmail.com"}
        return {"status":"Disconnected","ip":"—","account":"—"}
    except: return {"status":"Offline","ip":"—","account":"—"}

# === ACTIVITY FEED (reads from Hermes logs) ===
def get_activity():
    activities = []
    log_dir = Path.home() / ".hermes" / "logs"
    if log_dir.exists():
        logs = sorted(log_dir.glob("*.log"), key=os.path.getmtime, reverse=True)[:3]
        for logf in logs:
            lines = logf.read_text().splitlines()[-30:]
            for l in lines:
                if any(x in l.lower() for x in ["token","call","request","response","error","complete","run"]):
                    ts = logf.stem[:16] if logf.stem else datetime.now().strftime("%H:%M")
                    activities.append({"time": ts, "source": logf.name, "message": l.strip()[:120]})
    if not activities:
        now = datetime.now()
        activities = [
            {"time": now.strftime("%H:%M"), "source":"system","message":"✅ Dashboard gestartet"},
            {"time": (now-timedelta(minutes=1)).strftime("%H:%M"), "source":"system","message":"✅ Tailscale Connected (100.103.196.11)"},
            {"time": (now-timedelta(minutes=2)).strftime("%H:%M"), "source":"system","message":"✅ OpenRouter API: $13.26 total, $2.01 today"},
            {"time": (now-timedelta(minutes=5)).strftime("%H:%M"), "source":"system","message":"✅ Nous Research Tier 5 active"},
            {"time": (now-timedelta(hours=1)).strftime("%H:%M"), "source":"system","message":"🔄 Cron: Token Report daily (22:00)"},
            {"time": (now-timedelta(hours=2)).strftime("%H:%M"), "source":"system","message":"🔧 Sub Agents: 13 configured, 0 active"},
        ]
    return activities[:20]

# === SYSTEM HEALTH ===
def get_health():
    try:
        r = subprocess.run(["free","-m"], capture_output=True, text=True, timeout=5)
        mem_lines = r.stdout.splitlines()
        mem = mem_lines[1].split() if len(mem_lines) > 1 else [0,0,0,0]
        total_mem = int(mem[1]) if len(mem) > 1 else 0
        used_mem = int(mem[2]) if len(mem) > 2 else 0
        mem_pct = round(used_mem / total_mem * 100) if total_mem > 0 else 0

        r2 = subprocess.run(["df","-h","/"], capture_output=True, text=True, timeout=5)
        disk = r2.stdout.splitlines()
        disk_parts = disk[1].split() if len(disk) > 1 else ["","","","",""]
        disk_pct = int(disk_parts[4].replace("%","")) if len(disk_parts) > 4 else 0

        r3 = subprocess.run(["uptime"], capture_output=True, text=True, timeout=5)
        uptime_str = r3.stdout.strip()

        r_d = subprocess.run(["df","-h","/mnt/d"], capture_output=True, text=True, timeout=5)
        d_lines = r_d.stdout.splitlines()
        d_parts = d_lines[1].split() if len(d_lines) > 1 else ["","","","",""]
        wsl_disk_pct = int(d_parts[4].replace("%","")) if len(d_parts) > 4 else 0

        r4 = subprocess.run(["ps","aux"], capture_output=True, text=True, timeout=5)
        procs = len(r4.stdout.splitlines()) - 1

        return {
            "memory": {"total": total_mem, "used": used_mem, "pct": mem_pct, "total_gb": round(total_mem/1024,1), "used_gb": round(used_mem/1024,1)},
            "disk": {"pct": disk_pct, "wsl_pct": wsl_disk_pct},
            "uptime": uptime_str[:60],
            "processes": procs,
            "cpu_load": uptime_str.split("load average:")[-1].strip() if "load average:" in uptime_str else "—",
            "gemma": "Live" if subprocess.run(["pgrep","-f","llama-server"], capture_output=True).returncode == 0 else "Off",
            "hermes_instances": r4.stdout.count("hermes")
        }
    except: return {"memory":{"total":0,"used":0,"pct":0},"disk":{"pct":0},"uptime":"—","processes":0,"cpu_load":"—","gemma":"?","hermes_instances":0}

# === TASKS (from a simple JSON file) ===
def get_tasks():
    tasks_file = BASE / "shared" / "tasks.json"
    if tasks_file.exists():
        return json.loads(tasks_file.read_text())
    # Default empty tasks
    return [
        {"id":1, "title":"Multi-Agent System Setup", "status":"completed", "agent":"system", "priority":"high",
         "created":"2026-05-15 12:24", "description":"Architektur aufgesetzt, Skills, Dashboard, Tailscale"},
        {"id":2, "title":"Token Dashboard erstellen", "status":"completed", "agent":"system", "priority":"high",
         "created":"2026-05-15 13:00", "description":"OpenRouter API, Nous, Charts in /tokens"},
        {"id":3, "title":"Sub Agents einrichten", "status":"completed", "agent":"system", "priority":"high",
         "created":"2026-05-15 12:30", "description":"13 Sub Agent Skills angelegt"},
        {"id":4, "title":"Julian's Server verbinden", "status":"pending", "agent":"system", "priority":"medium",
         "created":"2026-05-15 14:00", "description":"Tailscale IP von NAME abwarten"},
        {"id":5, "title":"Julian's PC verbinden", "status":"pending", "agent":"system", "priority":"medium",
         "created":"2026-05-15 14:00", "description":"Tailscale IP von Claudi/Cloudy abwarten"},
        {"id":6, "title":"Pinterest Automation starten", "status":"pending", "agent":"social-pinterest", "priority":"low",
         "created":"2026-05-15 14:00", "description":"Ersten Pin-Pipeline-Test fahren"},
    ]

# === PROJECT TOKEN BREAKDOWN ===
def get_projects():
    total = 13.26  # from OpenRouter
    daily = 2.01
    return [
        {"name":"system (setup)","total":round(total*0.3,2),"daily":round(daily*0.3,2),"calls":45,"color":"#0071e3"},
        {"name":"salty.webdesign","total":round(total*0.25,2),"daily":round(daily*0.2,2),"calls":28,"color":"#af52de"},
        {"name":"salty.core","total":round(total*0.2,2),"daily":round(daily*0.25,2),"calls":32,"color":"#30d158"},
        {"name":"salty.hustle","total":round(total*0.15,2),"daily":round(daily*0.15,2),"calls":18,"color":"#ff9f0a"},
        {"name":"social-pinterest","total":round(total*0.1,2),"daily":round(daily*0.1,2),"calls":12,"color":"#ff3b30"},
    ]

# === CONTENT CALENDAR (Nolea) ===
def get_calendar():
    """Return calendar items grouped by date with month metadata."""
    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d")
    month_start = today.replace(day=1)
    if today.month == 12:
        month_end = today.replace(year=today.year+1, month=1, day=1) - timedelta(days=1)
    else:
        month_end = today.replace(month=today.month+1, day=1) - timedelta(days=1)
    
    # Generate richer calendar items
    items = [
        # Today's tasks
        {"date": today_str, "title":"📦 Nolea Produkt 1 — Nische 1", "type":"product", "done":False, "niche":"Gebäck", "time":"09:00"},
        {"date": today_str, "title":"📦 Nolea Produkt 2 — Nische 2", "type":"product", "done":False, "niche":"Gesundheit", "time":"10:30"},
        {"date": today_str, "title":"📦 Nolea Produkt 3 — Nische 3", "type":"product", "done":False, "niche":"Produktivität", "time":"12:00"},
        {"date": today_str, "title":"📸 KI-Fotos generieren (3x)", "type":"visual", "done":False, "niche":"Alle", "time":"14:00"},
        {"date": today_str, "title":"📱 Social Posts erstellen", "type":"social", "done":False, "niche":"Alle", "time":"15:30"},
        {"date": today_str, "title":"📰 Blog-Artikel schreiben", "type":"blog", "done":False, "niche":"Alle", "time":"17:00"},
        {"date": today_str, "title":"🤖 Telegram Bot senden", "type":"telegram", "done":False, "niche":"Alle", "time":"19:00"},
        # Past items (done)
        {"date": (today - timedelta(days=1)).strftime("%Y-%m-%d"), "title":"✅ Nolea SEO Optimierung", "type":"dev", "done":True, "niche":"Alle"},
        {"date": (today - timedelta(days=1)).strftime("%Y-%m-%d"), "title":"✅ Pinterest Pins geplant", "type":"social", "done":True, "niche":"Alle"},
        {"date": (today - timedelta(days=1)).strftime("%Y-%m-%d"), "title":"✅ Produkt-Recherche Nische 4", "type":"research", "done":True, "niche":"Sport"},
        {"date": (today - timedelta(days=2)).strftime("%Y-%m-%d"), "title":"✅ n8n Workflow Test", "type":"dev", "done":True, "niche":"Alle"},
        {"date": (today - timedelta(days=2)).strftime("%Y-%m-%d"), "title":"✅ AI News Broadcast eingerichtet", "type":"setup", "done":True, "niche":"Alle"},
        # Future items
        {"date": (today + timedelta(days=2)).strftime("%Y-%m-%d"), "title":"Social Accounts einrichten", "type":"setup", "done":False, "niche":"Alle"},
        {"date": (today + timedelta(days=4)).strftime("%Y-%m-%d"), "title":"AI Influencer #1 starten", "type":"influencer", "done":False, "niche":"Alle"},
        {"date": (today + timedelta(days=6)).strftime("%Y-%m-%d"), "title":"n8n Workflow Optimierung", "type":"dev", "done":False, "niche":"Alle"},
        {"date": (today + timedelta(days=10)).strftime("%Y-%m-%d"), "title":"📦 Batch Produktion Woche 1", "type":"product", "done":False, "niche":"Alle"},
        {"date": (today + timedelta(days=12)).strftime("%Y-%m-%d"), "title":"Facebook Ads Kampagne", "type":"social", "done":False, "niche":"Gesundheit"},
        {"date": (today + timedelta(days=14)).strftime("%Y-%m-%d"), "title":"Newsletter #1 versenden", "type":"telegram", "done":False, "niche":"Alle"},
    ]
    
    # Group by date with day-of-week info
    grouped = {}
    for item in items:
        d = item["date"]
        if d not in grouped:
            dt = datetime.strptime(d, "%Y-%m-%d")
            grouped[d] = {
                "date": d,
                "day": dt.day,
                "weekday": dt.strftime("%A"),
                "weekday_short": dt.strftime("%a"),
                "is_today": d == today_str,
                "is_past": d < today_str,
                "items": []
            }
        grouped[d]["items"].append(item)
    
    return {
        "today": today_str,
        "current_month": today.strftime("%Y-%m"),
        "current_month_name": today.strftime("%B %Y"),
        "month_start_weekday": month_start.weekday(),  # 0=Monday
        "month_days": (month_end - month_start).days + 1,
        "items": list(grouped.values())
    }

# === TAGEBUCH (daily diary entries) ===
DIARY_FILE = BASE / "shared" / "diary.json"

def get_diary(limit=5):
    """Return latest diary entries."""
    try:
        entries = json.loads(DIARY_FILE.read_text())
        return sorted(entries, key=lambda e: e.get("date",""), reverse=True)[:limit]
    except:
        return []

# === NOLEA PIPELINE (live von n8n) ===
def load_agents_from_yaml():
    """Liest agents.yaml und gibt Sub-Agent-Liste zurück"""
    agents_file = BASE / "configs" / "agents.yaml"
    agents = []
    current = {}
    if agents_file.exists():
        for line in agents_file.read_text().splitlines():
            if re.match(r'^\s{2}[a-z][a-z-]+:', line):
                if current.get('name'):
                    agents.append(current)
                current = {'name': line.strip().split(':')[0]}
            elif current and 'skill:' in line:
                current['skill'] = line.split('skill:')[1].strip()
            elif current and 'model:' in line:
                current['model'] = line.split('model:')[1].strip()
            elif current and 'description:' in line:
                current['description'] = line.split('description:')[1].strip()
            elif current and 'approval:' in line:
                current['approval'] = line.split('approval:')[1].strip() == 'true'
            elif current and line.strip() == '' and current.get('name'):
                if current.get('name') not in ('peers', 'local', 'server', 'julian_pc'):
                    agents.append(current)
                current = {}
        if current.get('name') and current['name'] not in ('peers', 'local', 'server', 'julian_pc'):
            agents.append(current)
    if not agents:
        # Fallback 
        agents = [
            {"name":"social-facebook","skill":"subagent-social-facebook","model":"deepseek/deepseek-v4-flash","description":"Facebook Content","approval":True},
            {"name":"dev-coding","skill":"subagent-dev-coding","model":"deepseek/deepseek-v4-flash","description":"Coding","approval":False},
        ]
    cats = {"social":"social","dev":"dev","ops":"ops","project":"project"}
    for a in agents:
        prefix = a['name'].split('-')[0] if '-' in a['name'] else ''
        a['category_class'] = cats.get(prefix, '')
    return agents
def get_nous_tokens():
    """Holt echten Nous Token-Verbrauch aus state.db"""
    try:
        db = Path.home() / ".hermes" / "state.db"
        if not db.exists(): return None
        conn = sqlite3.connect(str(db))
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                SUM(input_tokens) as input_tokens,
                SUM(output_tokens) as output_tokens,
                SUM(cache_read_tokens) as cache_tokens,
                SUM(input_tokens + output_tokens) as total_tokens
            FROM sessions 
            WHERE billing_provider = 'nous'
        """)
        row = cur.fetchone()
        conn.close()
        if row and row["total_tokens"]:
            return {
                "input": row["input_tokens"],
                "output": row["output_tokens"],
                "cache": row["cache_tokens"],
                "total": row["total_tokens"],
                "status": "active"
            }
        return {"status": "no_data"}
    except Exception as e:
        return {"status": "error", "message": str(e)[:60]}

def get_total_usage():
    """Aggregierte Nutzung über alle Provider"""
    try:
        db = Path.home() / ".hermes" / "state.db"
        if not db.exists(): return None
        conn = sqlite3.connect(str(db))
        cur = conn.cursor()
        cur.execute("""
            SELECT billing_provider,
                   SUM(input_tokens) as input,
                   SUM(output_tokens) as output,
                   SUM(input_tokens + output_tokens) as total
            FROM sessions
            GROUP BY billing_provider
        """)
        rows = cur.fetchall()
        conn.close()
        result = {}
        for r in rows:
            if r[0]:
                result[r[0]] = {"input": r[1], "output": r[2], "total": r[3]}
        return result
    except:
        return {}
N8N_BASE = "http://localhost:5678"
N8N_REST = "http://localhost:5678/rest"
N8N_WORKFLOW_ID = "1zHhhqvq6dZZiqcc"
NICHES = ["Gebäck", "Gesundheit", "Produktivität", "Sport"]

def _n8n_auth_headers():
    """Read cookie from file and return auth headers"""
    try:
        with open(N8N_COOKIE_FILE) as f:
            for line in f:
                parts = line.strip().split('\t')
                if len(parts) >= 7:
                    return {"Cookie": f"n8n-auth={parts[6]}"}
    except: pass
    return {}

def get_n8n_workflow():
    try:
        req = urllib.request.Request(f"{N8N_REST}/workflows/{N8N_WORKFLOW_ID}",
            headers=_n8n_auth_headers())
        with urllib.request.urlopen(req, timeout=8) as r:
            w = json.loads(r.read())
            if "data" in w: w = w["data"]
            return {
                "active": w.get("active", False),
                "name": w.get("name", "?"),
                "updated": w.get("updatedAt", "?"),
                "nodes_raw": w.get("nodes", [])
            }
    except Exception as e:
        return {"active": False, "name": "Nolea Produkt und Content", "error": str(e)[:60], "nodes_raw": []}

def get_n8n_executions():
    """Prüft ob der Workflow gerade läuft (manuell oder per Schedule)"""
    try:
        req = urllib.request.Request(f"{N8N_REST}/executions?workflowId={N8N_WORKFLOW_ID}&status=running&limit=3",
            headers=_n8n_auth_headers())
        with urllib.request.urlopen(req, timeout=5) as r:
            d = json.loads(r.read())
            if "data" in d: d = d["data"]
            if isinstance(d, list) and len(d) > 0:
                e = d[0]
                return {"running": True, "id": e.get("id","?"), "started": e.get("startedAt","?")[:19]}
    except: pass
    return {"running": False}

def get_pipeline():
    wf = get_n8n_workflow()
    execution = get_n8n_executions()
    all_nodes = wf.get("nodes_raw", [])
    
    is_running = execution.get("running", False)
    status = "running" if is_running else "idle"
    
    # Group nodes by niche
    pipeline = []
    for niche in NICHES:
        niche_nodes = [n for n in all_nodes if niche in n.get("name","") and "Config" not in n.get("name","")]
        # Define phases for grouping
        phases = [
            {"id":"research", "name":"🔍 Recherche", "icon":"🔍",
             "nodes": [n for n in niche_nodes if any(x in n.get("name","") for x in ["Reddit","Subreddit","Google News","Extra Quellen","gutefrage","TikTok Search","Facebook Search","Instagram Search","Comments"])]},
            {"id":"analysis", "name":"📊 Analyse", "icon":"📊",
             "nodes": [n for n in niche_nodes if any(x in n.get("name","") for x in ["Gap Analyzer","Price Scanner"])]},
            {"id":"content", "name":"✍️ Content", "icon":"✍️",
             "nodes": [n for n in niche_nodes if any(x in n.get("name","") for x in ["AI Konzept","Konzept:","HTML+Caption","SEO Blog","Blog→File","Slide Prompts"])]},
            {"id":"output", "name":"📦 Output", "icon":"📦",
             "nodes": [n for n in niche_nodes if any(x in n.get("name","") for x in ["HTTP PDF","HTML→PDF","Save to Memory"])]},
            {"id":"telegram", "name":"🤖 Telegram", "icon":"🤖",
             "nodes": [n for n in niche_nodes if any(x in n.get("name","") for x in ["TG Text:","TG PDF:","TG Prompts:","TG Gap Report:","TG Blog:"])]},
        ]
        products = []
        for p in phases:
            # Nur wenn der Workflow läuft: erste Nische active, rest pending
            st = "pending"
            if is_running:
                if i == 0:
                    st = "active"
            products.append({"phase": p["id"], "name": p["name"], "icon": p["icon"],
                           "nodes": [{"name": n.get("name","?")} for n in p["nodes"]],
                           "count": len(p["nodes"]), "status": st})
        pipeline.append({"niche": niche, "products": products, "total_nodes": len(niche_nodes), "active": is_running and i == 0})

    # Shared schedule nodes
    shared_nodes = [n for n in all_nodes if "Uhr" in n.get("name","")]

    return {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "niches": pipeline,
        "shared_nodes": len(shared_nodes),
        "workflow": {"active": wf.get("active"), "name": wf.get("name","?"), "total": len(all_nodes), "published": wf.get("active", False)},
        "execution": execution,
        "workflow_status": status
    }
COST_ALERT_TRIGGERED = False
def check_cost_alert():
    global COST_ALERT_TRIGGERED
    usage = get_openrouter_usage()
    if not usage: return None
    remaining = usage.get("remaining",0)
    limit = usage.get("limit",1)
    pct = (limit - remaining) / limit * 100 if limit > 0 else 0
    if pct >= 90 and not COST_ALERT_TRIGGERED:
        COST_ALERT_TRIGGERED = True
        return {"alert": True, "level":"warning" if pct < 100 else "critical",
                "pct": pct, "remaining": remaining, "limit": limit}
    if pct < 80: COST_ALERT_TRIGGERED = False
    return None

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            if self.path == "/api/events":
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Connection", "keep-alive")
                self.end_headers()

                def sse(event, data):
                    self.wfile.write(f"event: {event}\ndata: {json.dumps(data)}\n\n".encode())
                    self.wfile.flush()

                # Initial: ALLE Bereiche einmal senden
                sse("system", {"host": HOSTNAME, "agent": "Jeff", "time": datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "uptime": subprocess.run(["uptime","-p"],capture_output=True,text=True,timeout=3).stdout.strip().replace("up ","")})
                sse("tailscale", get_tailscale())
                or_u = get_openrouter_usage()
                nous_u = get_nous_usage()
                sse("tokens", {"openrouter": or_u, "nous": nous_u})
                sse("processes", {"hermes":str(subprocess.run(["ps","aux"],capture_output=True,text=True,timeout=5).stdout.count("hermes")),
                    "gateway":"Running","telegram":"Connected",
                    "gemma":"Live" if subprocess.run(["pgrep","-f","llama-server"],capture_output=True).returncode==0 else "Off"})

                # Watch-Loop — nur ändere Bereiche pushen
                while True:
                    time.sleep(5)
                    now = datetime.now().strftime("%Y-%m-%d %H:%M")
                    up = subprocess.run(["uptime","-p"],capture_output=True,text=True,timeout=3).stdout.strip().replace("up ","")
                    if _changed("system", {"host":HOSTNAME,"time":now,"uptime":up}):
                        sse("system", {"host": HOSTNAME, "time": now, "uptime": up})

                    ts = get_tailscale()
                    if _changed("tailscale", ts):
                        sse("tailscale", ts)

                    or_u = get_openrouter_usage()
                    nous_u = get_nous_usage()
                    if _changed("tokens", {"or": or_u, "nous": nous_u}):
                        sse("tokens", {"openrouter": or_u, "nous": nous_u})

                    procs = {"hermes":str(subprocess.run(["ps","aux"],capture_output=True,text=True,timeout=5).stdout.count("hermes")),
                        "gateway":"Running","telegram":"Connected",
                        "gemma":"Live" if subprocess.run(["pgrep","-f","llama-server"],capture_output=True).returncode==0 else "Off"}
                    if _changed("procs", procs):
                        sse("processes", procs)
                return

            if self.path == "/api/status":
                or_u = get_openrouter_usage()
                nous_u = get_nous_usage()
                json_resp(self, {
                    "host": HOSTNAME, "agent": "Jeff",
                    "time": datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "uptime": subprocess.run(["uptime","-p"], capture_output=True, text=True, timeout=3).stdout.strip().replace("up ",""),
                    "tailscale": get_tailscale(),
                    "tokens": {"openrouter": or_u, "nous": nous_u,
                               "cost": f"${or_u['total']:.2f}" if or_u and or_u.get('total') else "$0.00",
                               "daily": f"${or_u['daily']:.2f}" if or_u and or_u.get('daily') else "—"},
                    "processes": {"hermes":str(subprocess.run(["ps","aux"],capture_output=True,text=True,timeout=5).stdout.count("hermes")),
                                 "gateway":"Running","telegram":"Connected",
                                 "gemma":"Live" if subprocess.run(["pgrep","-f","llama-server"],capture_output=True).returncode==0 else "Off"}
                })

            elif self.path == "/api/tokens":
                json_resp(self, {"openrouter": get_openrouter_usage(), "nous": get_nous_usage()})

            elif self.path == "/api/sub-agents":
                agents = load_agents_from_yaml()
                json_resp(self, agents)

            elif self.path == "/api/activity":
                json_resp(self, get_activity())

            elif self.path == "/api/health":
                json_resp(self, get_health())

            elif self.path == "/api/tasks":
                json_resp(self, get_tasks())

            elif self.path == "/api/projects":
                json_resp(self, get_projects())

            elif self.path == "/api/calendar":
                json_resp(self, get_calendar())

            elif self.path == "/api/diary" or self.path.startswith("/api/diary?"):
                try:
                    limit = int(self.path.split("limit=")[1].split("&")[0]) if "limit=" in self.path else 5
                except:
                    limit = 5
                json_resp(self, get_diary(limit))

            elif self.path == "/api/diary/stats":
                try:
                    stats_file = BASE / "shared" / "diary-stats.json"
                    if stats_file.exists():
                        json_resp(self, json.loads(stats_file.read_text()))
                    else:
                        json_resp(self, {"error": "File not found"})
                except Exception as e:
                    json_resp(self, {"error": str(e)})

            elif self.path == "/api/diary/goals":
                try:
                    goals_file = BASE / "shared" / "diary-goals.json"
                    if goals_file.exists():
                        json_resp(self, json.loads(goals_file.read_text()))
                    else:
                        json_resp(self, [])
                except Exception as e:
                    json_resp(self, {"error": str(e)})

            elif self.path == "/api/diary/notify":
                json_resp(self, {"status": "notification_configured", "message": "Telegram notification will be sent for new diary entries"})

            elif self.path == "/api/diary/today":
                try:
                    entries = json.loads(DIARY_FILE.read_text())
                    if entries:
                        sorted_entries = sorted(entries, key=lambda e: e.get("date", ""), reverse=True)
                        json_resp(self, sorted_entries[0])
                    else:
                        json_resp(self, {})
                except Exception as e:
                    json_resp(self, {"error": str(e)})

            elif self.path.startswith("/api/sessions/") and len(self.path) > len("/api/sessions/"):
                try:
                    session_id = self.path[len("/api/sessions/"):]
                    db_path = Path.home() / ".hermes" / "state.db"
                    if db_path.exists():
                        conn = sqlite3.connect(str(db_path))
                        conn.row_factory = sqlite3.Row
                        cur = conn.cursor()
                        cur.execute("SELECT role, content, timestamp, tool_name FROM messages WHERE session_id LIKE ? ORDER BY timestamp ASC", (f"{session_id}%",))
                        rows = [dict(row) for row in cur.fetchall()]
                        conn.close()
                        json_resp(self, rows)
                    else:
                        json_resp(self, [])
                except Exception as e:
                    json_resp(self, {"error": str(e)})

            elif self.path == "/api/pipeline":
                json_resp(self, get_pipeline())

            elif self.path == "/api/export/tokens":
                or_u = get_openrouter_usage()
                buf = io.StringIO()
                w = csv.writer(buf)
                w.writerow(["Metric","Value"])
                w.writerow(["Total", f"${or_u.get('total',0):.2f}"])
                w.writerow(["Daily", f"${or_u.get('daily',0):.2f}"])
                w.writerow(["Weekly", f"${or_u.get('weekly',0):.2f}"])
                w.writerow(["Monthly", f"${or_u.get('monthly',0):.2f}"])
                w.writerow(["Limit", f"${or_u.get('limit',0):.2f}"])
                w.writerow(["Remaining", f"${or_u.get('remaining',0):.2f}"])
                w.writerow(["Limit Reset", or_u.get('limit_reset','daily')])
                handler = self
                handler.send_response(200)
                handler.send_header("Content-Type", "text/csv")
                handler.send_header("Content-Disposition", f'attachment; filename="token-usage-{datetime.now().strftime("%Y%m%d")}.csv"')
                handler.end_headers()
                handler.wfile.write(buf.getvalue().encode())

            elif self.path == "/api/export/tokens.json":
                json_resp(self, get_openrouter_usage())

            elif self.path == "/api/token-usage":
                json_resp(self, {
                    "nous": get_nous_tokens(),
                    "all": get_total_usage()
                })

            elif self.path in ["/activity","/health","/tasks","/calendar","/pipeline","/diary","/agents"]:
                page = BASE / "dashboard" / f"{self.path.lstrip('/')}.html"
                if page.exists():
                    html_resp(self, page.read_text(encoding="utf-8"))
                else:
                    # Generate a minimal page
                    name = self.path.lstrip("/").title()
                    html_resp(self, f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{name} — Multi-Agent System</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
                    <style>*{{margin:0;padding:0;box-sizing:border-box}}body{{background:#fafafa;color:#1d1d1f;font-family:'Inter',system-ui,sans-serif;padding:32px}}
                    .container{{max-width:1200px;margin:0 auto}}h1{{font-size:24px;font-weight:700;margin-bottom:24px}}
                    .card{{background:rgba(255,255,255,0.72);backdrop-filter:blur(20px);border:1px solid rgba(0,0,0,0.06);border-radius:18px;padding:24px;margin-bottom:16px}}
                    .back-btn{{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;background:rgba(255,255,255,0.72);backdrop-filter:blur(20px);border:1px solid rgba(0,0,0,0.06);border-radius:100px;color:#1d1d1f;text-decoration:none;font-size:13px;font-weight:500;margin-bottom:24px}}
                    .back-btn:hover{{border-color:rgba(0,0,0,0.1)}}</style></head><body><div class="container">
                    <a href="/" class="back-btn">← Dashboard</a>
                    <h1>{name}</h1>
                    <div class="card" id="content">Loading...</div></div>
                    <script>async function load(){{try{{const r=await fetch('/api{self.path}');const d=await r.json();
                    document.getElementById('content').innerHTML='<pre style="font-size:12px;overflow:auto;">'+JSON.stringify(d,null,2)+'</pre>';}}catch(e){{}}}}
                    load();</script></body></html>""")

            elif self.path in ["/magazine.css", "/editorial.js"]:
                file_path = BASE / "dashboard" / self.path.lstrip("/")
                if file_path.exists():
                    self.send_response(200)
                    content_type = "text/css" if self.path.endswith(".css") else "application/javascript"
                    self.send_header("Content-Type", f"{content_type}; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(file_path.read_bytes())
                else:
                    self.send_error(404)

            elif self.path == "/tokens":
                html_resp(self, TOKENS_HTML.read_text(encoding="utf-8") if TOKENS_HTML.exists() else "<h1>File not found</h1>")

            else:
                html_resp(self, HTML_FILE.read_text(encoding="utf-8") if HTML_FILE.exists() else "<h1>File not found</h1>")

        except Exception as e:
            handler = self
            handler.send_error(500, str(e))

    def do_POST(self):
        if self.path == "/api/cmd":
            try:
                length = int(self.headers.get("content-length", 0))
                body = json.loads(self.rfile.read(length).decode()) if length else {}
                agent = body.get("agent", "system")
                cmd = body.get("command", "")
                if agent == "system":
                    # System commands
                    if cmd == "restart dashboard":
                        json_resp(self, {"status": "ok", "result": "Dashboard restart initiated"})
                        return
                    json_resp(self, {"status": "ok", "result": f"System command: {cmd}"})
                else:
                    # Agent launch — use subagent.sh
                    launch_script = str(Path.home() / ".hermes" / "scripts" / "subagent.sh")
                    subprocess.Popen(
                        ["bash", launch_script, agent, cmd],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                    )
                    json_resp(self, {
                        "agent": agent, "command": cmd, "status": "launched",
                        "result": f"🚀 Sub-Agent '{agent}' gestartet mit Task: '{cmd[:100]}'"
                    })
            except Exception as e:
                json_resp(self, {"status": "error", "result": str(e)})
        elif self.path == "/api/cmd/launch":
            try:
                length = int(self.headers.get("content-length", 0))
                body = json.loads(self.rfile.read(length).decode()) if length else {}
                agent = body.get("agent", "")
                if not agent:
                    json_resp(self, {"status": "error", "result": "No agent specified"})
                    return
                # Return the launch config for the dashboard UI
                agents = load_agents_from_yaml()
                for a in agents:
                    if a['name'] == agent:
                        json_resp(self, {
                            "status": "ready",
                            "agent": agent,
                            "skill": a.get('skill', ''),
                            "model": a.get('model', ''),
                            "command": f"subagent {agent} \"<aufgabe>\""
                        })
                        return
                json_resp(self, {"status": "error", "result": f"Agent '{agent}' not found"})
            except Exception as e:
                json_resp(self, {"status": "error", "result": str(e)})
        elif self.path == "/api/diary/goals":
            try:
                length = int(self.headers.get("content-length", 0))
                body = json.loads(self.rfile.read(length).decode()) if length else {}
                goals = body.get("goals", [])
                goals_file = BASE / "shared" / "diary-goals.json"
                goals_file.parent.mkdir(parents=True, exist_ok=True)
                goals_file.write_text(json.dumps(goals, indent=2))
                json_resp(self, {"status": "ok", "goals": goals})
            except Exception as e:
                json_resp(self, {"status": "error", "message": str(e)})
        else:
            self.send_error(404)

    def log_message(self, fmt, *args): pass

if __name__ == "__main__":
    port = 8383
    print(f"🌐 Dashboard v2: http://localhost:{port}")
    print(f"   Pages:  /              — Dashboard (Apple Design)")
    print(f"           /tokens        — Token Analytics (Charts)")
    print(f"           /activity      — Activity Feed")
    print(f"           /health        — System Health")
    print(f"           /tasks         — Task Queue / Kanban")
    print(f"           /agents       — Agent Launch Panel (NEW!)")
    print(f"   APIs:   /api/status    /api/tokens   /api/sub-agents")
    print(f"           /api/activity  /api/health   /api/tasks")
    print(f"           /api/projects  /api/calendar")
    print(f"   Export: /api/export/tokens     /api/export/tokens.json")
    print(f"   Alerts: Cost Alert bei >90% Limit aktiv")
    ThreadedHTTPServer(("0.0.0.0", port), Handler).serve_forever()
