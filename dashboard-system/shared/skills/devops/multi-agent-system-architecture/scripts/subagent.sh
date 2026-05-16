#!/bin/bash
# ============================================================
# subagent v2 — Launch & Manage Sub-Agents
# Referenziert von: multi-agent-system-architecture SKILL.md
# Pfad: ~/.hermes/scripts/subagent.sh (Alias: subagent)
# ============================================================
set -euo pipefail
CONFIG="/mnt/d/hermes/multi-agent/configs/agents.yaml"
LOG_DIR="/mnt/d/hermes/multi-agent/shared/logs"
SUBAGENT_LOG="$LOG_DIR/subagent-runs.log"
mkdir -p "$LOG_DIR"
[ -f "$CONFIG" ] || { echo "agents.yaml nicht gefunden"; exit 1; }

[ "${1:-}" = "json" ] && exec python3 << 'PYEOF'
import re, json
with open("/mnt/d/hermes/multi-agent/configs/agents.yaml") as f:
    text = f.read()
agents = []; current = {}
for line in text.splitlines():
    m = re.match(r"^  ([a-z][a-z-]+):", line)
    if m:
        if current.get("name"): agents.append(current)
        current = {"name": m.group(1)}
    elif current and "skill:" in line: current["skill"] = line.split("skill:")[1].strip()
    elif current and "model:" in line: current["model"] = line.split("model:")[1].strip()
    elif current and "description:" in line: current["description"] = line.split("description:")[1].strip()
    elif current and "approval:" in line: current["approval"] = line.split("approval:")[1].strip() == "true"
    elif line.strip() == "" and current.get("name") and current["name"] not in ("peers","local","server","julian_pc"):
        agents.append(current); current = {}
if current.get("name") and current["name"] not in ("peers","local","server","julian_pc"):
    agents.append(current)
print(json.dumps(agents, indent=2))
PYEOF

[ "${1:-}" = "log" ] && { [ -f "$SUBAGENT_LOG" ] && tail -20 "$SUBAGENT_LOG" | awk -F'|' '{if($4=="OK") printf "  ✅ "; else printf "  ❌ "; print $1, $2, $3}' || echo "Keine Logs"; exit 0; }

[ "${1:-}" = "show" ] && { NAME="${2:-}"; [ -n "$NAME" ] || { echo "subagent show <name>"; exit 1; }; exec python3 -c "
import re
with open('/mnt/d/hermes/multi-agent/configs/agents.yaml') as f:
    text = f.read()
current = {}; found = False; name = '$NAME'
for line in text.splitlines():
    m = re.match(r'^  ([a-z][a-z-]+):', line)
    if m:
        if current.get('name') == name: found = True; break
        current = {'name': m.group(1)}
    elif current and 'skill:' in line: current['skill'] = line.split('skill:')[1].strip()
    elif current and 'model:' in line: current['model'] = line.split('model:')[1].strip()
    elif current and 'description:' in line: current['description'] = line.split('description:')[1].strip()
    elif current and 'approval:' in line: current['approval'] = line.split('approval:')[1].strip() == 'true'
if not found and current.get('name') == name: found = True
if found:
    app_str = 'Ja (Approval)' if current.get('approval') else 'Nein (Auto)'
    print(f\"  Name:       {current.get('name','?')}\")
    print(f\"  Skill:      {current.get('skill','?')}\")
    print(f\"  Model:      {current.get('model','?')}\")
    print(f\"  Beschr:     {current.get('description','?')}\")
    print(f\"  Approval:   {app_str}\")
else: print(f\"Agent '{name}' nicht gefunden\")
"; exit 0; }

# Default: list or help
if [ $# -eq 0 ] || [ "${1:-}" = "list" ] || [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    exec python3 << 'PYEOF'
import re
agents = []; current = {}
with open("/mnt/d/hermes/multi-agent/configs/agents.yaml") as f:
    for line in f.read().splitlines():
        m = re.match(r"^  ([a-z][a-z-]+):", line)
        if m:
            if current.get("name"): agents.append(current)
            current = {"name": m.group(1)}
        elif current and "model:" in line: current["model"] = line.split("model:")[1].strip()
        elif current and "description:" in line: current["description"] = line.split("description:")[1].strip()[:50]
        elif current and "approval:" in line: current["approval"] = line.split("approval:")[1].strip() == "true"
        elif line.strip() == "" and current.get("name") and current["name"] not in ("peers","local","server","julian_pc"):
            agents.append(current); current = {}
    if current.get("name") and current["name"] not in ("peers","local","server","julian_pc"):
        agents.append(current)
cats = {"social":"Social Media","dev":"Development","ops":"Operations","project":"Projects"}
by_cat = {}
for a in agents:
    prefix = a["name"].split("-")[0]
    by_cat.setdefault(cats.get(prefix, "Other"), []).append(a)
print("\n  Sub-Agent Launch Center v2\n")
for cat_name in ["Social Media","Development","Operations","Projects"]:
    items = by_cat.get(cat_name, [])
    if not items: continue
    print(f"  [{cat_name}]")
    for a in items:
        app = "Approval" if a.get("approval") else "Auto"
        print(f"    {a['name']:<22} [{app:>8}]  {a.get('description','')}")
    print("")
print("  Commands:")
print('    subagent run <name> \'<task>\'    Agent mit Skill starten')
print("    subagent show <name>           Details anzeigen")
print("    subagent json                  JSON output")
print("    subagent log                   Letzte Runs")
print("")
PYEOF
    exit 0
fi

# run: Agent execution
if [ "${1:-}" = "run" ]; then
    NAME="${2:-}"; shift 2; TASK="$*"
    [ -n "$NAME" ] && [ -n "$TASK" ] || { echo "subagent run <name> '<task>'"; exit 1; }
    SKILL=""; APPROVAL=false
    while IFS= read -r line; do
        [[ "$line" =~ ^\ $NAME: ]] && FOUND=true
        [ "${FOUND:-false}" = true ] && [[ "$line" =~ skill:\ (.+) ]] && SKILL="${BASH_REMATCH[1]}"
        [ "${FOUND:-false}" = true ] && [[ "$line" =~ approval:\ (.+) ]] && [ "${BASH_REMATCH[1]}" = "true" ] && APPROVAL=true
        [ "${FOUND:-false}" = true ] && [[ "$line" =~ ^$ ]] && break
    done < "$CONFIG"
    [ -n "$SKILL" ] || { echo "Agent '$NAME' nicht gefunden"; exit 1; }
    if [ "$APPROVAL" = true ]; then
        echo "  Agent $NAME benoetigt Approval. Task: $TASK"
        read -r -p "  Starten? (y/N): " CONFIRM
        [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ] || { echo "Abgebrochen"; exit 0; }
    fi
    echo ""; echo "  Starting: $NAME (Skill: $SKILL)"; echo "  Task: $TASK"; echo ""
    echo "$(date '+%Y-%m-%d %H:%M')|$NAME|${TASK:0:60}|OK" >> "$SUBAGENT_LOG"
    hermes -s "$SKILL" chat -q "$TASK"
    echo ""; echo "Done."; exit 0
fi

# exec: direct prompt (fallback, no skill)
[ "${1:-}" = "exec" ] && { NAME="${2:-}"; shift 2; PROMPT="$*"; [ -n "$PROMPT" ] || { echo "subagent exec <name> '<prompt>'"; exit 1; }; echo "  Exec: $NAME"; echo "  $PROMPT"; echo ""; hermes chat -q "$PROMPT"; echo "Done."; exit 0; }

# Fallback: run mode if name + task detected
NAME="$1"
command -v "$NAME" >/dev/null 2>&1 && exec "$NAME" "$@"
shift; TASK="$*"
[ -n "$NAME" ] && [ -n "$TASK" ] && exec bash "$0" run "$NAME" "$TASK"
echo "Unbekannt. Nutzung: subagent list | run | show | exec | json | log"
exit 1
