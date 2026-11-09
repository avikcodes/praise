#!/usr/bin/env bash
# ==============================================================================
# Praise Core — Automated Production Restore Script
# Requires explicit archive path and --confirm flag to prevent accidental overwrite.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ $# -lt 1 ]; then
  echo "Usage: ./scripts/restore.sh <path-to-archive.tar.gz> [--confirm]"
  echo "Example: ./scripts/restore.sh backups/praise-backup-2026-11-09T14-30-00Z.tar.gz --confirm"
  exit 1
fi

cd "${PROJECT_ROOT}"
node "${SCRIPT_DIR}/restore.mjs" "$@"

