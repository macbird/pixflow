#!/usr/bin/env bash
# Safe Square Cloud rollout: migrate before restart, install deps on boot, health gate.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

API_PUBLIC_BASE_URL="${API_PUBLIC_BASE_URL:-https://pixflow.squareweb.app}"
SQUARE_CLOUD_APP_ID="${SQUARE_CLOUD_APP_ID:?SQUARE_CLOUD_APP_ID is required}"
SQUARE_CLOUD_API_TOKEN="${SQUARE_CLOUD_API_TOKEN:?SQUARE_CLOUD_API_TOKEN is required}"
ROLLBACK_MODE="${ROLLBACK_MODE:-0}"

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "::error::Missing required env var: $name" >&2
    exit 1
  fi
}

health_check() {
  local label="$1"
  if ! curl -fsS --max-time 25 "${API_PUBLIC_BASE_URL}/health" >/dev/null 2>&1; then
    echo "::warning::${label}: ${API_PUBLIC_BASE_URL}/health is not healthy"
    return 1
  fi
  local db_health
  db_health="$(curl -fsS --max-time 25 "${API_PUBLIC_BASE_URL}/health/db")"
  echo "${label} db: ${db_health}"
  echo "${db_health}" | grep -q '"ok":true'
}

wait_for_health() {
  local attempts="${1:-20}"
  local sleep_seconds="${2:-15}"
  echo "==> Waiting for API health (up to $((attempts * sleep_seconds))s)..."
  for attempt in $(seq 1 "${attempts}"); do
    if health_check "attempt ${attempt}/${attempts}"; then
      echo "==> Health OK on attempt ${attempt}"
      return 0
    fi
    sleep "${sleep_seconds}"
  done
  return 1
}

echo "========================================"
echo " Square Cloud rollout"
echo " App: ${SQUARE_CLOUD_APP_ID}"
echo " URL: ${API_PUBLIC_BASE_URL}"
echo " SHA: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
if [ "${ROLLBACK_MODE}" = "1" ]; then
  echo " Mode: ROLLBACK"
fi
echo "========================================"

require_env DATABASE_URL
require_env CLIENT_P12_BASE64
require_env JWT_SECRET

if [ "${ROLLBACK_MODE}" != "1" ]; then
  echo "==> Pre-deploy health snapshot"
  if health_check "pre-deploy"; then
    if [ -n "${GITHUB_ENV:-}" ]; then
      echo "PRE_DEPLOY_HEALTHY=1" >> "${GITHUB_ENV}"
    fi
  else
    echo "::warning::Pre-deploy health check failed — continuing deploy anyway"
  fi

  echo "==> Apply database migrations before restart (old app keeps serving during migrate)"
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
else
  echo "==> Rollback mode: skipping prisma migrate deploy"
fi

echo "==> Prepare Square Cloud runtime files"
bash deploy/scripts/prepare-squarecloud-deploy.sh

echo "==> Square Cloud login"
npm install -g @squarecloud/cli
squarecloud auth login --token "${SQUARE_CLOUD_API_TOKEN}"

echo "==> Commit + restart"
squarecloud app commit "${SQUARE_CLOUD_APP_ID}" --restart

if ! wait_for_health 20 15; then
  echo "::error::Post-deploy health check failed"
  squarecloud app logs "${SQUARE_CLOUD_APP_ID}" 2>&1 | tail -40 || true
  exit 1
fi

echo "==> Rollout completed successfully"
