#!/usr/bin/env bash
# ============================================================
# deploy.sh — One-command setup for a remote 24/7 server
# 
# Usage:
#   git clone <repo-url> /opt/your-service
#   cd /opt/your-service
#   cp config.example.json config.json   # edit tailscale_ip etc.
#   sudo ./deploy.sh
# ============================================================
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="your-service"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
PORT="${PORT:-8383}"

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║            Server Deployment                  ║"
echo "  ╚══════════════════════════════════════════════╝"
echo "   Repo: $REPO_DIR   Port: $PORT"

# ── 1. Prüfungen ──
if [ "$EUID" -ne 0 ]; then
    echo "❌ Bitte mit sudo ausführen: sudo ./deploy.sh"
    exit 1
fi

# ── 2. Abhängigkeiten ──
echo "⟐ System-Abhängigkeiten..."
apt-get update -qq && apt-get install -y -qq python3 python3-pip curl jq ufw > /dev/null 2>&1

# ── 3. Shared-Verzeichnisse ──
mkdir -p "$REPO_DIR/shared/tokens" "$REPO_DIR/shared/logs"

# ── 4. Firewall ──
ufw allow "$PORT/tcp" > /dev/null 2>&1 || true

# ── 5. Systemd Service ──
cat > "$SERVICE_FILE" << SERVICE
[Unit]
Description=$SERVICE_NAME
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$REPO_DIR
ExecStart=/usr/bin/python3 $REPO_DIR/server/server-deploy.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
sleep 3

# ── 6. Health-Check ──
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "✅ Service läuft"
    if curl -sf "http://localhost:$PORT/api/status" > /dev/null 2>&1; then
        echo "✅ Dashboard antwortet: http://localhost:$PORT"
    fi
else
    echo "❌ Service nicht aktiv — Logs: journalctl -u $SERVICE_NAME -n 30"
fi

# ── 7. Tailscale-Info ──
if command -v tailscale &> /dev/null; then
    TS_IP=$(tailscale status 2>/dev/null | awk '/^[0-9]/{print $1; exit}' || echo "?")
    [ -n "$TS_IP" ] && echo "🌐 Tailscale: http://$TS_IP:$PORT"
fi

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║              Deployment Done!                 ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""
echo "   Lokal:    http://localhost:$PORT"
echo "   Update:   cd $REPO_DIR && git pull && systemctl restart $SERVICE_NAME"
echo "   Logs:     journalctl -u $SERVICE_NAME -f"
