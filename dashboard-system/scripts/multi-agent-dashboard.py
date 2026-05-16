#!/usr/bin/env python3
"""
Multi-Agent System Dashboard
Übersicht aller Agents, Devices, Tasks und Token-Verbrauch.
"""
import json, os, subprocess
from pathlib import Path
from datetime import datetime

HERMES_BASE = Path("/mnt/d/hermes/multi-agent")
SHARED = HERMES_BASE / "shared"
TOKENS_FILE = SHARED / "tokens" / "usage.json"
HOSTNAME = os.uname().nodename

def get_tailscale_status():
    try:
        ts = str(Path.home() / ".local/bin/tailscale")
        sock = str(Path.home() / ".local/share/tailscale/tailscaled.sock")
        r = subprocess.run([ts, f"--socket={sock}", "status"],
                         capture_output=True, text=True, timeout=5)
        if r.stdout and "suffix" in r.stdout:
            for line in r.stdout.strip().split("\n"):
                if "suffix" in line:
                    parts = line.split()
                    ip = parts[0] if len(parts) > 0 else "?"
                    name = parts[1] if len(parts) > 1 else "?"
                    return f"🟢 {name} ({ip})"
        return "❌ Not connected" if r.returncode else "🟢 Connected"
    except:
        return "❌ Tailscale not running"

def get_gateway_status():
    state_file = Path.home() / ".hermes" / "gateway_state.json"
    if state_file.exists():
        data = json.loads(state_file.read_text())
        platforms = data.get("platforms", {})
        tg = platforms.get("telegram", {})
        gw_state = data.get("gateway_state", "unknown")
        return f"Gateway: {'🟢' + gw_state if gw_state == 'running' else '🔴' + gw_state} | Telegram: {'🟢' if tg.get('state') == 'connected' else '🔴'}"
    return "❌ No gateway state"

def get_token_summary():
    if not TOKENS_FILE.exists():
        return "No token data yet"
    data = json.loads(TOKENS_FILE.read_text())
    t = data.get("total", {})
    return f"💰 Total: P:{t.get('prompt_tokens',0):,}  C:{t.get('completion_tokens',0):,}  ${t.get('cost_usd',0):.4f}"

def get_running_agents():
    try:
        r = subprocess.run(["ps", "aux"], capture_output=True, text=True, timeout=5)
        lines = r.stdout.splitlines()
        j = l = t = c = 0
        for line in lines:
            if "hermes" in line and "python" in line:
                if "gateway" in line.lower(): j += 1
                else: l += 1
            if "llama-server" in line: t += 1
            if "tailscale" in line and "tailscaled" in line: c += 1
        return f"🧠 Hermes: {l} inst | 🌐 Gateway: {j} inst | 🤖 Gemma4: {'🟢' if t else '⚪'} | 🔗 TS: {'🟢' if c else '⚪'}"
    except:
        return "Could not check processes"

def get_cron_jobs():
    try:
        r = subprocess.run(["hermes", "cron", "list"], capture_output=True, text=True, timeout=10)
        return r.stdout.strip() or "No cron jobs"
    except:
        return "Could not check cron"

def print_dashboard():
    print()
    print("╔══════════════════════════════════════════════════╗")
    print(f"║  🚀 MULTI-AGENT SYSTEM DASHBOARD                ║")
    print(f"║  Host: {HOSTNAME:<37} ║")
    print(f"║  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S'):<37} ║")
    print("╠══════════════════════════════════════════════════╣")
    
    print(f"║  {get_running_agents():<48} ║")
    print(f"║  {get_gateway_status():<48} ║")
    print(f"║  {get_token_summary():<48} ║")
    
    ts = get_tailscale_status().split("\n")
    print(f"║  {'🔗 Tailscale:':<48} ║")
    for line in ts[:3]:
        print(f"║  {line:<48} ║")
    
    print("╠══════════════════════════════════════════════════╣")
    print("║  📋 Main Agent: Jeff (Damian's PC)              ║")
    print("║  📋 Peaks:                                      ║")
    print("║    NAME     → Julian's Server  (IP: ausstehend)  ║")
    print("║    ClaudiCloudy → Julian's PC (IP: ausstehend)  ║")
    print("╠══════════════════════════════════════════════════╣")
    
    print("║  📂 Shared dirs:                                 ║")
    for d in sorted(SHARED.iterdir()):
        if d.is_dir():
            files = len(list(d.iterdir())) - 1  # minus .lock
            print(f"║    📁 {d.name:<20} ({max(0,files)} items)              ║")
    
    print("╠══════════════════════════════════════════════════╣")
    print("║  📅 Cron Jobs:                                   ║")
    print("║    - multi-agent-sync (every 1h)                 ║")
    print("║    - token-report-daily (22:00)                  ║")
    print("╚══════════════════════════════════════════════════╝")

if __name__ == "__main__":
    print_dashboard()
