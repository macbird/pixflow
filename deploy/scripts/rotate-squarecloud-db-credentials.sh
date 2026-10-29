#!/usr/bin/env bash
# One-time / manual: refresh Postgres password and client.p12 for GitHub secrets.
# Usage (on a machine with curl, openssl, python3):
#   export SQUARE_CLOUD_API_TOKEN=...
#   export SQUARE_CLOUD_DATABASE_ID=30b40510823f45d9b12fcfc694e95f27
#   bash deploy/scripts/rotate-squarecloud-db-credentials.sh
#
# Optional: RESET_PASSWORD=1 to call Square Cloud password reset API first.
# Optional: RESET_CERTIFICATE=1 to also rotate the TLS client certificate.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=deploy/scripts/squarecloud-db-credentials.lib.sh
. "${ROOT_DIR}/deploy/scripts/squarecloud-db-credentials.lib.sh"

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing env: $name" >&2
    exit 1
  fi
}

require_env SQUARE_CLOUD_API_TOKEN
require_env SQUARE_CLOUD_DATABASE_ID

HOST="square-cloud-db-${SQUARE_CLOUD_DATABASE_ID}.squareweb.app"
PORT="7247"
P12_PATH="/application/client.p12"
P12_PASSWORD="${SQUARE_CLOUD_P12_PASSWORD:-squarecloud}"
DB_PASS=""

if [ "${RESET_PASSWORD:-0}" = "1" ]; then
  echo "==> Resetting database password via API"
  DB_PASS="$(sqcloud_reset_db_password "${SQUARE_CLOUD_DATABASE_ID}")"
  echo "New password generated."
else
  require_env DATABASE_URL
  DB_PASS="$(python3 -c "from urllib.parse import urlparse; print(urlparse('''${DATABASE_URL}''').password or '')")"
  if [ -z "$DB_PASS" ]; then
    echo "Set DATABASE_URL or RESET_PASSWORD=1" >&2
    exit 1
  fi
fi

if [ "${RESET_CERTIFICATE:-0}" = "1" ]; then
  if [ "${RESET_PASSWORD:-0}" = "1" ]; then
    echo "==> Waiting ${SQUARE_CLOUD_RESET_COOLDOWN}s for reset rate limit"
    sleep "${SQUARE_CLOUD_RESET_COOLDOWN}"
  fi
  echo "==> Rotating TLS client certificate via API"
  sqcloud_reset_certificate "${SQUARE_CLOUD_DATABASE_ID}"
fi

echo "==> Fetching certificate"
sqcloud_write_client_p12 "${SQUARE_CLOUD_DATABASE_ID}" client.p12
P12_B64="$(base64 -w 0 client.p12 2>/dev/null || base64 client.p12 | tr -d '\n')"

DATABASE_URL="postgresql://squarecloud:${DB_PASS}@${HOST}:${PORT}/squarecloud?sslmode=require&sslidentity=${P12_PATH}&sslpassword=${P12_PASSWORD}&schema=public"

echo ""
echo "=== Update GitHub Secrets (Settings → Secrets → Actions) ==="
echo ""
echo "DATABASE_URL:"
echo "$DATABASE_URL"
echo ""
echo "CLIENT_P12_BASE64:"
echo "$P12_B64"
echo ""
echo "Optional local copy:"
printf '%s\n' "$DATABASE_URL" > deploy/artifacts/database_url_squarecloud.txt
echo "  deploy/artifacts/database_url_squarecloud.txt"
