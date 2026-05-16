#!/usr/bin/env bash
# deploy.sh — One-command setup for 24/7 server deployment
# Usage: sudo ./deploy.sh
# Source: ~/multi-agent-dashboard/deploy.sh

set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="multi-agent-dashboard"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
DASHBOARD_PORT="${DASHBOARD_PORT:-8383}"

# ── Prüfungen ──
if [ "$EUID" -ne 0 ]; then
    echo "Bitte mit sudo ausführen: sudo ./deploy.sh"
    exit 1
fi

# ── System-Abhängigkeiten ──
apt-get update -qq
apt-get install -y -qq python3 python3-pip curl jq ufw > /dev/null 2>&1 || true

# ── Shared-Verzeichnisse ──
mkdir -p "$REPO_DIR/shared/tokens" "$REPO_DIR/shared/logs"

# ── Firewall ──
ufw allow "$DASHBOARD_PORT/tcp" > /dev/null 2>&1 || true

# ── Systemd Service ──
cat > "$SERVICE_FILE" << SERVICE
[Unit]
Description=$SERVICE_NAME
After=network.target tailscaled.service

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

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
sleep 3

# ── Health Check ──
if curl -sf "http://localhost:$DASHBOARD_PORT/api/status" > /dev/null 2>&1; then
    echo "✅ Dashboard läuft auf Port $DASHBOARD_PORT"
else
    echo "⚠️  Service läuft, aber API antwortet nicht — Logs prüfen:"
    echo "   journalctl -u $SERVICE_NAME --no-pager -n 30"
fi

# ── Tailscale-URL ──
if command -v tailscale &> /dev/null; then
    TS_IP=$(tailscale status 2>/dev/null | awk '/^[0-9]/{print $1; exit}' || echo "?")
    [ -n "$TS_IP" ] && [ "$TS_IP" != "?" ] && echo "🌐 Tailscale: http://$TS_IP:$DASHBOARD_PORT"
fi

echo ""
echo "✅ Deployment abgeschlossen!"
echo "   Lokal:  http://localhost:$DASHBOARD_PORT"
echo "   Logs:   journalctl -u $SERVICE_NAME -f"
echo "   Update: cd $REPO_DIR && git pull && systemctl restart $SERVICE_NAME"