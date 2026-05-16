#!/bin/bash
# ============================================================
# Multi-Agent System Setup Script
# Führt die Ersteinrichtung eines Main Agents durch
# Aufruf: curl -fsSL https://hermes-agent.sh/install | bash
# Danach: bash setup-main-agent.sh
# ============================================================
set -e

echo "╔══════════════════════════════════════════════╗"
echo "║  🚀 Multi-Agent System — Main Agent Setup   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# === Schritt 1: Hostname abfragen ===
read -p "Agent-Name (Jeff / NAME / ClaudiCloudy): " AGENT_NAME
read -p "Device-Typ (server / pc): " DEVICE_TYPE
DEVICE_HOST=$(hostname)

echo ""
echo "📋 Konfiguration:"
echo "  Agent: $AGENT_NAME"
echo "  Host:  $DEVICE_HOST"
echo "  Typ:   $DEVICE_TYPE"
read -p "Fortfahren? (Y/n): " CONFIRM
[[ "$CONFIRM" =~ ^[Nn] ]] && echo "Abgebrochen." && exit 1

# === Schritt 2: Tailscale installieren ===
echo ""
echo "📡 Installing Tailscale..."
if ! which tailscale &>/dev/null; then
    curl -fsSL https://tailscale.com/install.sh | sh
else
    echo "✅ Tailscale already installed"
fi

echo ""
echo "🌐 Bitte Tailscale authentifizieren:"
sudo tailscale up
echo "✅ Tailscale connected!"

# === Schritt 3: Tailscale-IP speichern ===
TAILSCALE_IP=$(tailscale ip -4)
echo "  IP: $TAILSCALE_IP"

# === Schritt 4: Shared-Verzeichnisse anlegen ===
echo ""
echo "📁 Creating shared directories..."
mkdir -p ~/.hermes/shared/{skills,logs,tokens,plans,calendar,configs}
echo "✅ Shared directories created"

# === Schritt 5: Multi-Agent Config schreiben ===
cat > ~/.hermes/shared/configs/agents.yaml << CONFIG
# ============================================================
# Sub-Agent Launch Config — $AGENT_NAME on $DEVICE_HOST
# ============================================================
sub_agents:
  # === Social Media ===
  social-facebook:
    skill: subagent-social-facebook
    model: gpt-4o-mini
    description: Facebook Content-Management
    approval: true

  social-pinterest:
    skill: subagent-social-pinterest
    model: claude-sonnet-4
    description: Pinterest Pin-Automation
    approval: true

  social-tiktok:
    skill: subagent-social-tiktok
    model: claude-sonnet-4
    description: TikTok Content-Produktion
    approval: true

  social-instagram:
    skill: subagent-social-instagram
    model: gpt-4o-mini
    description: Instagram Posts, Stories, Reels
    approval: true

  # === Development ===
  dev-coding:
    skill: subagent-dev-coding
    model: deepseek/deepseek-v4-flash
    description: Allgemeine Coding-Aufgaben
    approval: false

  dev-backend:
    skill: subagent-dev-backend
    model: claude-sonnet-4
    description: Backend/API Entwicklung
    approval: true

  dev-design-uiux:
    skill: subagent-dev-design-uiux
    model: claude-sonnet-4
    description: UI/UX Design & Prototypen
    approval: false

  # === Operations ===
  ops-security:
    skill: subagent-ops-security
    model: claude-sonnet-4
    description: Sicherheits-Monitoring
    approval: true

  ops-checker:
    skill: subagent-ops-checker
    model: claude-sonnet-4
    description: Qualitätsprüfung / Reviewer
    approval: false

  ops-planner:
    skill: subagent-ops-planner
    model: claude-sonnet-4
    description: Task-Planung & Decomposition
    approval: false

  # === Projects (Nolea / Salty) ===
  project-salty-core:
    skill: subagent-project-salty-core
    model: claude-sonnet-4
    description: salty.core Kern-Entwicklung
    approval: false

  project-salty-hustle:
    skill: subagent-project-salty-hustle
    model: claude-sonnet-4
    description: Business-Automation
    approval: true

  project-salty-webdesign:
    skill: subagent-project-salty-webdesign
    model: claude-sonnet-4
    description: Nolea Webentwicklung & Design
    approval: false

peers:
  server:
    name: NAME
    host: Julian's Server
    tailscale_ip: "$TAILSCALE_IP"
    main_agent: $(whoami)
CONFIG
echo "✅ Config written"

# === Schritt 6: Aliases hinzufügen ===
echo "" >> ~/.bashrc
echo "# === Multi-Agent System Aliases ===" >> ~/.bashrc
echo 'alias dashboard="$HOME/.local/bin/multi-agent-dashboard.py"' >> ~/.bashrc
echo 'alias tokens="$HOME/.local/bin/token-tracker.py"' >> ~/.bashrc
echo 'alias ts-status="tailscale status"' >> ~/.bashrc
echo 'alias sub-agents="cat ~/.hermes/shared/configs/agents.yaml"' >> ~/.bashrc
echo "# === End Multi-Agent Aliases ===" >> ~/.bashrc
echo "✅ Aliases added"

# === Schritt 7: Token-Tracking-Skript kopieren ===
# (wird vom Sync-Skript verteilt)

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                         ║"
echo "║  Agent: $AGENT_NAME                         ║"
echo "║  Host:  $DEVICE_HOST                        ║"
echo "║  IP:    $TAILSCALE_IP                       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Nächste Schritte:"
echo "1. Sync Skills vom Mother-Device:"
echo "   rsync -avz damia@<JEFF_IP>:.hermes/shared/skills/.hermes/skills/"
echo "2. Dashboard testen: dashboard"
echo "3. Telegram Gateway verbinden"
