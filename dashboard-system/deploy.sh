#!/usr/bin/env bash
# ============================================================
# Multi-Agent Dashboard — Server Deployment Script
# Führt einmalige Einrichtung auf Julians Server aus.
# 
# Usage:
#   git clone <repo-url> /opt/multi-agent-dashboard
#   cd /opt/multi-agent-dashboard
#   sudo ./deploy.sh
# ============================================================
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="multi-agent-dashboard"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
DASHBOARD_PORT="${DASHBOARD_PORT:-8383}"

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║  Multi-Agent Dashboard — Server Deployment  ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""
echo "   Repo:   $REPO_DIR"
echo "   Port:   $DASHBOARD_PORT"
echo ""

# ── 1. Prüfungen ──────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
    echo "   ❌ Bitte mit sudo ausführen: sudo ./deploy.sh"
    exit 1
fi

if [ ! -f "$REPO_DIR/server/server-dashboard.py" ]; then
    echo "   ❌ server-dashboard.py nicht gefunden. Bist du im Repo-Root?"
    exit 1
fi

# ── 2. System-Abhängigkeiten ──────────────────────────
echo "   ⟐ System-Abhängigkeiten prüfen..."
apt-get update -qq
apt-get install -y -qq python3 python3-pip curl jq ufw > /dev/null 2>&1 || true
echo "   ✅ Python3, curl, jq, ufw installiert"

# ── 3. Python-Abhängigkeiten ──────────────────────────
echo "   ⟐ Python-Pakete prüfen..."
pip3 install -q requests 2>/dev/null || true
echo "   ✅ Python-Basis-Abhängigkeiten"

# ── 4. Shared-Verzeichnisse ───────────────────────────
echo "   ⟐ Shared-Verzeichnisse anlegen..."
mkdir -p "$REPO_DIR/shared/tokens"
mkdir -p "$REPO_DIR/shared/logs"
echo "   ✅ Verzeichnisse bereit"

# ── 5. Standard-Tasks-JSON (falls nicht vorhanden) ─────
if [ ! -f "$REPO_DIR/shared/tasks.json" ]; then
    INIT_DATE=$(date +%Y-%m-%d' '%H:%M)
    cat > "$REPO_DIR/shared/tasks.json" << TASKS
[
  {"id":1,"title":"Dashboard eingerichtet","status":"completed","agent":"system","priority":"high","created":"$INIT_DATE","description":"Server-Deployment abgeschlossen"}
]
TASKS
    echo "   ✅ Initial tasks.json angelegt"
fi

# ── 6. UFW-Firewall ───────────────────────────────────
echo "   ⟐ Firewall (Port $DASHBOARD_PORT freigeben)..."
ufw allow "$DASHBOARD_PORT/tcp" > /dev/null 2>&1 || true
echo "   ✅ Port $DASHBOARD_PORT freigegeben"

# ── 7. Systemd Service ────────────────────────────────
echo "   ⟐ Systemd-Service erstellen..."
cat > "$SERVICE_FILE" << SERVICE
[Unit]
Description=Multi-Agent Dashboard Server
After=network.target tailscaled.service
Wants=tailscaled.service

[Service]
Type=simple
User=root
WorkingDirectory=$REPO_DIR
ExecStart=/usr/bin/python3 $REPO_DIR/server/server-dashboard.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=DASHBOARD_PORT=$DASHBOARD_PORT
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
echo "   ✅ Systemd-Service eingerichtet ($SERVICE_NAME)"

# ── 8. Start ──────────────────────────────────────────
echo "   ⟐ Dashboard starten..."
systemctl restart "$SERVICE_NAME"
sleep 3

# ── 9. Health-Check ───────────────────────────────────
echo ""
echo "   ── Health-Check ──"
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "   ✅ Service läuft (active)"
    # HTTP-Check
    if curl -sf "http://localhost:$DASHBOARD_PORT/api/status" > /dev/null 2>&1; then
        echo "   ✅ Dashboard antwortet auf Port $DASHBOARD_PORT"
    else
        echo "   ⚠️  Service läuft, aber /api/status antwortet nicht"
    fi
else
    echo "   ❌ Service NICHT aktiv — Logs prüfen:"
    echo "      journalctl -u $SERVICE_NAME --no-pager -n 30"
fi

# ── 10. Tailscale-Info ─────────────────────────────────
if command -v tailscale &> /dev/null; then
    TS_IP=$(tailscale status 2>/dev/null | awk '/^[0-9]/{print $1; exit}' || echo "?")
    if [ -n "$TS_IP" ] && [ "$TS_IP" != "?" ]; then
        echo "   🌐 Tailscale: http://$TS_IP:$DASHBOARD_PORT"
    fi
fi

# ── Zusammenfassung ───────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║               Deployment Done!               ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""
echo "   Lokal:    http://localhost:$DASHBOARD_PORT"
echo "   Status:   systemctl status $SERVICE_NAME"
echo "   Logs:     journalctl -u $SERVICE_NAME -f"
echo "   Stopp:    systemctl stop $SERVICE_NAME"
echo "   Update:   cd $REPO_DIR && git pull && systemctl restart $SERVICE_NAME"
echo ""
echo "   ⚡ Julian's Server läuft 24/7!"
echo "   🔗 Von deinem WSL: http://<julian-tailscale-ip>:$DASHBOARD_PORT"
echo ""

# ── Optional: n8n Setup ───────────────────────────────
echo "   Möchtest du n8n auf dem Server installieren?"
echo "   (Für Pipeline-Feature — aktuell optional)"
echo "   → Überspringen: Drücke Enter"
echo "   → Installieren: Tippe 'n8n' und Enter"
read -r N8N_CHOICE

if [ "$N8N_CHOICE" = "n8n" ]; then
    echo ""
    echo "   ⟐ n8n Setup..."
    if ! command -v node &> /dev/null; then
        echo "   ⟐ Node.js installieren..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y -qq nodejs > /dev/null 2>&1
    fi
    npm install -g n8n > /dev/null 2>&1
    echo "   ✅ n8n installiert"

    N8N_BIN=$(which n8n)
    cat > /etc/systemd/system/n8n.service << N8N_SERVICE
[Unit]
Description=n8n Workflow Automation
After=network.target

[Service]
Type=simple
User=root
ExecStart=$N8N_BIN
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
N8N_SERVICE

    systemctl daemon-reload
    systemctl enable n8n
    systemctl restart n8n
    echo "   ✅ n8n Service eingerichtet (Port 5678)"
    echo "   🌐 n8n: http://localhost:5678"
fi

echo ""
echo "  ✅ Fertig!"