#!/usr/bin/env bash
# Square Cloud rollout: migrate before restart, explicit health + version verification.
# On failure the workflow FAILS — no automatic rollback (avoids masking broken deploys).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

API_PUBLIC_BASE_URL="${API_PUBLIC_BASE_URL:-https://pixflow.squareweb.app}"
SQUARE_CLOUD_APP_ID="${SQUARE_CLOUD_APP_ID:?SQUARE_CLOUD_APP_ID is required}"
SQUARE_CLOUD_API_TOKEN="${SQUARE_CLOUD_API_TOKEN:?SQUARE_CLOUD_API_TOKEN is required}"

EXPECTED_GIT_SHA="$(git rev-parse HEAD)"
EXPECTED_GIT_SHA_SHORT="$(git rev-parse --short HEAD)"

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "::error::Missing required env var: $name" >&2
    exit 1
  fi
}

write_step_summary() {
  local status="$1"
  local health_json="$2"
  if [ -z "${GITHUB_STEP_SUMMARY:-}" ]; then
    return 0
  fi
  {
    echo "## Deploy Square Cloud — ${status}"
    echo ""
    echo "| Campo | Valor |"
    echo "|-------|-------|"
    echo "| Commit esperado | \`${EXPECTED_GIT_SHA_SHORT}\` (\`${EXPECTED_GIT_SHA}\`) |"
    echo "| URL | ${API_PUBLIC_BASE_URL} |"
    echo "| App ID | ${SQUARE_CLOUD_APP_ID} |"
    echo ""
    echo "### Health em produção"
    echo '```json'
    echo "${health_json}"
    echo '```'
  } >> "${GITHUB_STEP_SUMMARY}"
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
  local attempts="${1:-30}"
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

verify_deployed_version() {
  local health_json
  health_json="$(curl -fsS --max-time 25 "${API_PUBLIC_BASE_URL}/health")"
  echo "==> Production /health:"
  echo "${health_json}"

  local deployed_sha
  deployed_sha="$(echo "${health_json}" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('gitSha') or '')" 2>/dev/null || true)"

  if [ -z "${deployed_sha}" ]; then
    echo "::error::Production /health did not return gitSha — cannot confirm deployed version"
    write_step_summary "FALHOU (versão não confirmada)" "${health_json}"
    return 1
  fi

  if [ "${deployed_sha}" != "${EXPECTED_GIT_SHA}" ]; then
    echo "::error::Deployed gitSha mismatch: expected ${EXPECTED_GIT_SHA}, got ${deployed_sha}"
    write_step_summary "FALHOU (SHA divergente)" "${health_json}"
    return 1
  fi

  write_step_summary "SUCESSO" "${health_json}"
  echo "==> Deploy version confirmed: ${EXPECTED_GIT_SHA_SHORT}"
  return 0
}

echo "========================================"
echo " Square Cloud rollout"
echo " App: ${SQUARE_CLOUD_APP_ID}"
echo " URL: ${API_PUBLIC_BASE_URL}"
echo " SHA: ${EXPECTED_GIT_SHA_SHORT} (${EXPECTED_GIT_SHA})"
echo "========================================"

require_env DATABASE_URL
require_env CLIENT_P12_BASE64
require_env JWT_SECRET

echo "==> Pre-deploy health snapshot"
if health_check "pre-deploy"; then
  echo "Pre-deploy: healthy"
else
  echo "::warning::Pre-deploy health check failed — app may already be down"
fi

echo "==> Prepare Square Cloud runtime files (client.p12 + start-prod.sh)"
bash deploy/scripts/prepare-squarecloud-deploy.sh

echo "==> Apply database migrations before restart (local client.p12 for CI)"
if [ ! -f .ci-migrate-database-url ]; then
  echo "::error::Missing .ci-migrate-database-url from prepare-squarecloud-deploy.sh" >&2
  exit 1
fi
CI_DATABASE_URL="$(cat .ci-migrate-database-url)"
DATABASE_URL="${CI_DATABASE_URL}" npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "==> Bundle production dependencies for Square Cloud (no npm install on boot)"
npm install --omit=dev
npx prisma generate --schema apps/api/prisma/schema.prisma

echo "==> Square Cloud login"
npm install -g @squarecloud/cli
squarecloud auth login --token "${SQUARE_CLOUD_API_TOKEN}"

echo "==> Commit + restart (expected SHA ${EXPECTED_GIT_SHA_SHORT})"
squarecloud app commit "${SQUARE_CLOUD_APP_ID}" --restart

if ! wait_for_health 30 15; then
  echo "::error::Post-deploy health check failed — workflow will FAIL (no auto-rollback)"
  squarecloud app logs "${SQUARE_CLOUD_APP_ID}" 2>&1 | tail -50 || true
  write_step_summary "FALHOU (health)" "{}"
  exit 1
fi

if ! verify_deployed_version; then
  squarecloud app logs "${SQUARE_CLOUD_APP_ID}" 2>&1 | tail -50 || true
  exit 1
fi

echo "==> Rollout completed — version ${EXPECTED_GIT_SHA_SHORT} confirmed in production"
