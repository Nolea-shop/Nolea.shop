#!/usr/bin/env bash
# api-key-leak-scanner Cron-Wrapper
# Usage: bash cron-wrapper.sh [duration_minutes]
# Wrapper für wiederholte automatische Ausführung mit Fehlerbehandlung,
# Logging und Benachrichtigung.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../scripts" && pwd)"
SCAN_SCRIPT="${SCRIPT_DIR}/scan_leaks.py"
LOG_DIR="${HOME}/.hermes/logs/key-scanner"
OUTPUT_DIR="${HOME}/.hermes/data/key-scanner"
DURATION="${1:-45}"

mkdir -p "${LOG_DIR}" "${OUTPUT_DIR}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/scan_${TIMESTAMP}.log"
JSON_OUTPUT="${OUTPUT_DIR}/scan_${TIMESTAMP}.json"

echo "[$(date -Iseconds)] START API-Key-Leak-Scan (Dauer: ${DURATION}min)" | tee "${LOG_FILE}"

# Laufzeitbegrenzung via timeout (Dauer * 60 Sekunden + 5min Puffer)
if timeout $((DURATION * 60 + 300)) python3 "${SCAN_SCRIPT}" --duration "${DURATION}" 2>&1 | tee "${LOG_FILE}"; then
    echo "[$(date -Iseconds)] Scan erfolgreich abgeschlossen." | tee -a "${LOG_FILE}"
    echo "JSON: ${JSON_OUTPUT}"
else
    EXIT_CODE=$?
    echo "[$(date -Iseconds)] Scan beendet mit Code ${EXIT_CODE} (Timeout oder Fehler)." | tee -a "${LOG_FILE}"
    echo "Prüfe Log für Details: ${LOG_FILE}"
fi
