#!/usr/bin/env bash
# ==============================================================================
# Praise Core — Automated Production Backup Script
# Suitable for Linux crontab, systemd timers, and automated operations.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

echo "============================================================================="
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting Praise Core automated backup..."
echo "Project Root: ${PROJECT_ROOT}"
echo "Backup Dir:   ${BACKUP_DIR}"
echo "============================================================================="

cd "${PROJECT_ROOT}"

# Execute the Node.js backup engine
node "${SCRIPT_DIR}/backup.mjs" --output-dir "${BACKUP_DIR}" "$@"

# Automated retention policy cleanup: delete archives older than RETENTION_DAYS
if [ -d "${BACKUP_DIR}" ] && [ "${RETENTION_DAYS}" -gt 0 ]; then
  echo "==> Enforcing backup retention policy (${RETENTION_DAYS} days)..."
  PRUNED_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 -name "praise-backup-*.tar.gz" -mtime +"${RETENTION_DAYS}" | wc -l || true)
  if [ "${PRUNED_COUNT}" -gt 0 ]; then
    find "${BACKUP_DIR}" -maxdepth 1 -name "praise-backup-*.tar.gz" -mtime +"${RETENTION_DAYS}" -delete
    echo "✔ Cleaned up ${PRUNED_COUNT} expired backup archive(s)."
  else
    echo "✔ No expired archives to prune."
  fi
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Praise Core backup process finished successfully."

