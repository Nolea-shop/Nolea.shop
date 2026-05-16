#!/bin/bash
# ============================================================
# Multi-Agent System Sync Script
# Synchronisiert Skills, Logs und Token-Daten zwischen Geräten
# via Tailscale (wenn 100.x.x.x erreichbar) oder rsync/Telegram
# ============================================================
set -euo pipefail

BASE_DIR="/mnt/d/hermes/multi-agent/shared"
SYNC_LOG="$BASE_DIR/logs/sync-$(date +%Y%m%d).log"

# === Config: Tailscale IPs der anderen Main Agents ===
# Setze diese nach Tailscale-Login
NAME_IP=""      # Julian's Server (Primary)
CLOUDY_IP=""    # Julian's PC

log() {
    echo "[$(date '+%H:%M:%S')] $*" | tee -a "$SYNC_LOG"
}

sync_device() {
    local ip="$1"
    local name="$2"
    log "=== Attempting sync with $name ($ip) ==="

    if ping -c 1 -W 3 "$ip" &>/dev/null; then
        log "✅ $name reachable, syncing..."

        # Skills bidirektional syncen
        rsync -avz --delete \
            -e "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5" \
            "$BASE_DIR/skills/" "damia@$ip:$BASE_DIR/skills/" 2>>"$SYNC_LOG" || true

        # Logs sammeln (nicht löschen, nur kopieren)
        rsync -avz \
            -e "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5" \
            "damia@$ip:$BASE_DIR/logs/" "$BASE_DIR/logs/$name/" 2>>"$SYNC_LOG" || true

        # Token-Daten syncen
        rsync -avz --delete \
            -e "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5" \
            "$BASE_DIR/tokens/" "damia@$ip:$BASE_DIR/tokens/" 2>>"$SYNC_LOG" || true

        # Pläne syncen
        rsync -avz --delete \
            -e "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5" \
            "$BASE_DIR/plans/" "damia@$ip:$BASE_DIR/plans/" 2>>"$SYNC_LOG" || true

        log "✅ Sync with $name complete"
    else
        log "⚠️  $name not reachable, skipped"
    fi
}

# === MAIN ===
log "=== Multi-Agent Sync Run $(date '+%Y-%m-%d %H:%M') ==="

# Eigene Skills in shared exportieren
log "Exporting local skills to shared..."
rsync -avz --delete --exclude='subagent-*' "$HOME/.hermes/skills/" "$BASE_DIR/skills/" 2>>"$SYNC_LOG" || true

# Sync mit anderen Devices
[ -n "$NAME_IP" ] && sync_device "$NAME_IP" "NAME"
[ -n "$CLOUDY_IP" ] && sync_device "$CLOUDY_IP" "ClaudiCloudy"

log "=== Sync Complete ==="
