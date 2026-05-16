#!/usr/bin/env python3
"""
Multi-Agent Token Tracking System
Speichert Token-Verbrauch pro Agent und Projekt in ~/.hermes/shared/tokens/
"""
import json
import os
from datetime import datetime
from pathlib import Path

SHARED_DIR = Path("/mnt/d/hermes/multi-agent/shared")
TOKENS_FILE = SHARED_DIR / "tokens" / "usage.json"
LOGS_DIR = SHARED_DIR / "logs"

# Agenten auf diesem Device
DEVICE_NAME = os.uname().nodename
MAIN_AGENT = "Jeff"  # Dieser PC

def init_tokens_file():
    TOKENS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not TOKENS_FILE.exists():
        data = {
            "metadata": {
                "device": DEVICE_NAME,
                "main_agent": MAIN_AGENT,
                "created": datetime.now().isoformat(),
            },
            "agents": {},
            "projects": {},
            "daily": {},
            "total": {"prompt_tokens": 0, "completion_tokens": 0, "cost_usd": 0.0},
        }
        TOKENS_FILE.write_text(json.dumps(data, indent=2))

def track_usage(agent_name, project, prompt_tokens, completion_tokens, cost=0.0):
    """Track token usage for an agent and project."""
    init_tokens_file()
    data = json.loads(TOKENS_FILE.read_text())
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Per Agent
    if agent_name not in data["agents"]:
        data["agents"][agent_name] = {"prompt_tokens": 0, "completion_tokens": 0, "cost_usd": 0.0}
    data["agents"][agent_name]["prompt_tokens"] += prompt_tokens
    data["agents"][agent_name]["completion_tokens"] += completion_tokens
    data["agents"][agent_name]["cost_usd"] += cost
    
    # Per Project
    if project not in data["projects"]:
        data["projects"][project] = {"prompt_tokens": 0, "completion_tokens": 0, "cost_usd": 0.0}
    data["projects"][project]["prompt_tokens"] += prompt_tokens
    data["projects"][project]["completion_tokens"] += completion_tokens
    data["projects"][project]["cost_usd"] += cost
    
    # Daily
    if today not in data["daily"]:
        data["daily"][today] = {"prompt_tokens": 0, "completion_tokens": 0, "cost_usd": 0.0}
    data["daily"][today]["prompt_tokens"] += prompt_tokens
    data["daily"][today]["completion_tokens"] += completion_tokens
    data["daily"][today]["cost_usd"] += cost
    
    # Total
    data["total"]["prompt_tokens"] += prompt_tokens
    data["total"]["completion_tokens"] += completion_tokens
    data["total"]["cost_usd"] += cost
    
    TOKENS_FILE.write_text(json.dumps(data, indent=2))

def report():
    """Print a summary report."""
    if not TOKENS_FILE.exists():
        print("No token data yet.")
        return
    
    data = json.loads(TOKENS_FILE.read_text())
    print(f"\n{'='*60}")
    print(f"  Token Usage Report — Device: {DEVICE_NAME}")
    print(f"  Main Agent: {MAIN_AGENT}")
    print(f"{'='*60}")
    
    print(f"\n📊 TOTAL:")
    t = data["total"]
    print(f"  Prompt: {t['prompt_tokens']:>10,}  |  Completion: {t['completion_tokens']:>10,}  |  Cost: ${t['cost_usd']:.4f}")
    
    print(f"\n🤖 PER AGENT:")
    for agent, usage in sorted(data["agents"].items()):
        print(f"  {agent:<20}  P:{usage['prompt_tokens']:>8,}  C:{usage['completion_tokens']:>8,}  ${usage['cost_usd']:.4f}")
    
    print(f"\n📁 PER PROJECT:")
    for proj, usage in sorted(data["projects"].items()):
        print(f"  {proj:<20}  P:{usage['prompt_tokens']:>8,}  C:{usage['completion_tokens']:>8,}  ${usage['cost_usd']:.4f}")
    
    print(f"\n📅 LAST 7 DAYS:")
    sorted_days = sorted(data["daily"].keys())[-7:]
    for day in sorted_days:
        usage = data["daily"][day]
        print(f"  {day}  P:{usage['prompt_tokens']:>8,}  C:{usage['completion_tokens']:>8,}  ${usage['cost_usd']:.4f}")
    
    totals = {k: sum(v[k] for v in [data["daily"][d] for d in sorted_days]) for k in ["prompt_tokens", "completion_tokens", "cost_usd"]}
    print(f"  {'─'*55}")
    print(f"  {'7-Day Total':<12}  P:{totals['prompt_tokens']:>8,}  C:{totals['completion_tokens']:>8,}  ${totals['cost_usd']:.4f}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "track":
        # CLI: track <agent> <project> <prompt_tokens> <completion_tokens> [cost]
        agent = sys.argv[2]
        project = sys.argv[3]
        pt = int(sys.argv[4])
        ct = int(sys.argv[5])
        cost = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0
        track_usage(agent, project, pt, ct, cost)
        print(f"✅ Tracked: {agent}/{project} → +{pt}P +{ct}C ${cost:.4f}")
    else:
        report()
