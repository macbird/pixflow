#!/usr/bin/env bash
# One-time / manual: refresh Postgres password and client.p12 for GitHub secrets.
# Usage (on a machine with curl, openssl, python3):
#   export SQUARE_CLOUD_API_TOKEN=...
#   export SQUARE_CLOUD_DATABASE_ID=30b40510823f45d9b12fcfc694e95f27
#   bash deploy/scripts/rotate-squarecloud-db-credentials.sh
#
# Optional: RESET_PASSWORD=1 to call Square Cloud password reset API first.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

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
  RESET_JSON="$(curl -sS -m 30 -X POST \
    -H "Authorization: ${SQUARE_CLOUD_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"reset":"password"}' \
    "https://api.squarecloud.app/v2/databases/${SQUARE_CLOUD_DATABASE_ID}/credentials/reset")"
  DB_PASS="$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d['response']['password'])" <<< "$RESET_JSON")"
  echo "New password generated."
else
  require_env DATABASE_URL
  DB_PASS="$(python3 -c "from urllib.parse import urlparse; print(urlparse('''${DATABASE_URL}''').password or '')")"
  if [ -z "$DB_PASS" ]; then
    echo "Set DATABASE_URL or RESET_PASSWORD=1" >&2
    exit 1
  fi
fi

echo "==> Fetching certificate"
CERT_JSON="$(mktemp)"
trap 'rm -f "$CERT_JSON"' EXIT
HTTP_CODE="$(curl -sS -m 30 -o "$CERT_JSON" -w "%{http_code}" \
  -H "Authorization: ${SQUARE_CLOUD_API_TOKEN}" \
  "https://api.squarecloud.app/v2/databases/${SQUARE_CLOUD_DATABASE_ID}/credentials/certificate")"
if [ "$HTTP_CODE" != "200" ]; then
  echo "Certificate API HTTP ${HTTP_CODE}" >&2
  cat "$CERT_JSON" >&2
  exit 1
fi

python3 deploy/scripts/build-squarecloud-p12.py "$CERT_JSON" client.p12
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
