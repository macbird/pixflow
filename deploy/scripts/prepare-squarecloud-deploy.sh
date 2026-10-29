#!/usr/bin/env bash
# Prepares Square Cloud deploy artifacts from GitHub secrets (no API calls).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=deploy/scripts/squarecloud-db-credentials.lib.sh
. "${ROOT_DIR}/deploy/scripts/squarecloud-db-credentials.lib.sh"

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "::error::Missing required env var: $name" >&2
    exit 1
  fi
}

require_env JWT_SECRET

# Autoprovision mode: when a Square Cloud API token and database id are provided,
# derive DATABASE_URL + client.p12 live from the API instead of relying on the
# hand-maintained DATABASE_URL / CLIENT_P12_BASE64 secrets. This makes deploys
# immune to Square Cloud password rotation — the stable API token mints fresh
# credentials every run, so a rotated password can no longer take the app down.
# When the inputs are absent, the legacy secret-based path below is used.
if [ -n "${SQUARE_CLOUD_API_TOKEN:-}" ] && [ -n "${SQUARE_CLOUD_DATABASE_ID:-}" ]; then
  echo "==> Autoprovisioning DB credentials from Square Cloud API (database ${SQUARE_CLOUD_DATABASE_ID})"
  SQUARE_CLOUD_DB_HOST="${SQUARE_CLOUD_DB_HOST:-square-cloud-db-${SQUARE_CLOUD_DATABASE_ID}.squareweb.app}"
  SQUARE_CLOUD_DB_PORT="${SQUARE_CLOUD_DB_PORT:-7247}"
  SQUARE_CLOUD_DB_NAME="${SQUARE_CLOUD_DB_NAME:-squarecloud}"
  SQUARE_CLOUD_DB_USER="${SQUARE_CLOUD_DB_USER:-squarecloud}"

  echo "==> Resetting Square Cloud DB password"
  DB_PASS="$(sqcloud_reset_db_password "${SQUARE_CLOUD_DATABASE_ID}")"

  # The TLS client certificate can also be invalidated by a rotation, so
  # regenerate it by default. Resets are rate-limited to 1 every 3s per user, so
  # wait before the second reset. Set SQUARE_CLOUD_DB_RESET_CERT=0 to skip.
  if [ "${SQUARE_CLOUD_DB_RESET_CERT:-1}" != "0" ]; then
    echo "==> Regenerating TLS client certificate (waiting ${SQUARE_CLOUD_RESET_COOLDOWN}s for reset rate limit)"
    sleep "${SQUARE_CLOUD_RESET_COOLDOWN}"
    sqcloud_reset_certificate "${SQUARE_CLOUD_DATABASE_ID}"
  fi

  echo "==> Fetching current client certificate"
  sqcloud_write_client_p12 "${SQUARE_CLOUD_DATABASE_ID}" client.p12
  CLIENT_P12_BASE64="$(base64 -w 0 client.p12 2>/dev/null || base64 client.p12 | tr -d '\n')"
  export CLIENT_P12_BASE64

  DATABASE_URL="$(sqcloud_build_database_url "${DB_PASS}" "${SQUARE_CLOUD_DB_HOST}" \
    "${SQUARE_CLOUD_DB_PORT}" "${SQUARE_CLOUD_DB_NAME}" "${SQUARE_CLOUD_DB_USER}")"
  export DATABASE_URL
  echo "==> Autoprovision complete (host ${SQUARE_CLOUD_DB_HOST})"
else
  require_env DATABASE_URL
  require_env CLIENT_P12_BASE64
fi

API_PUBLIC_BASE_URL="${API_PUBLIC_BASE_URL:-https://pixflow.squareweb.app}"
EVOLUTION_BASE_URL="${EVOLUTION_BASE_URL:-https://evolution-pixflow.squareweb.app}"
EVOLUTION_API_KEY="${EVOLUTION_API_KEY:-}"
CRED_KEY="${CREDENTIALS_ENCRYPTION_KEY:-$JWT_SECRET}"

if [ -z "$EVOLUTION_API_KEY" ]; then
  echo "::warning::EVOLUTION_API_KEY not set — WhatsApp Evolution connect will return 503 in production" >&2
fi
P12_PASSWORD="${SQUARE_CLOUD_P12_PASSWORD:-squarecloud}"
P12_PATH_PROD="${SQUARE_CLOUD_P12_PATH:-/application/client.p12}"
P12_PATH_CI="${ROOT_DIR}/client.p12"

build_database_url() {
  local p12_path="$1"
  P12_PATH="$p12_path" P12_PASSWORD="$P12_PASSWORD" python3 <<'PY'
import os
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

raw = os.environ["DATABASE_URL"].strip()
p12_path = os.environ["P12_PATH"]
p12_password = os.environ["P12_PASSWORD"]
parsed = urlparse(raw)

if not parsed.hostname:
    raise SystemExit("DATABASE_URL is missing hostname")

query = dict(parse_qsl(parsed.query, keep_blank_values=True))
query.pop("sslidentity", None)
query.pop("sslpassword", None)
query.pop("sslmode", None)
query["sslmode"] = "require"
query["sslidentity"] = p12_path
query["sslpassword"] = p12_password
query.setdefault("schema", "public")

print(urlunparse(parsed._replace(query=urlencode(query))))
PY
}

echo "==> Decoding client.p12 from CLIENT_P12_BASE64"
if ! echo "$CLIENT_P12_BASE64" | base64 -d > client.p12; then
  echo "::error::CLIENT_P12_BASE64 is not valid base64" >&2
  exit 1
fi
chmod 600 client.p12

if [ ! -s client.p12 ]; then
  echo "::error::Decoded client.p12 is empty" >&2
  exit 1
fi

echo "==> Normalizing DATABASE_URL (CI migrate + production boot)"
CI_DATABASE_URL="$(build_database_url "${P12_PATH_CI}")"
PRODUCTION_DATABASE_URL="$(build_database_url "${P12_PATH_PROD}")"

DEPLOY_GIT_SHA="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
DEPLOY_GIT_SHA_SHORT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "==> Writing start-prod.sh (deploy ${DEPLOY_GIT_SHA_SHORT})"
cat > start-prod.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
export PORT="${PORT:-80}"
export NODE_ENV="${NODE_ENV:-production}"
EOF
cat >> start-prod.sh <<EOF
export DATABASE_URL="\${DATABASE_URL:-${PRODUCTION_DATABASE_URL}}"
export JWT_SECRET="\${JWT_SECRET:-${JWT_SECRET}}"
export CREDENTIALS_ENCRYPTION_KEY="\${CREDENTIALS_ENCRYPTION_KEY:-${CRED_KEY}}"
export API_PUBLIC_BASE_URL="\${API_PUBLIC_BASE_URL:-${API_PUBLIC_BASE_URL}}"
export EVOLUTION_BASE_URL="\${EVOLUTION_BASE_URL:-${EVOLUTION_BASE_URL}}"
export EVOLUTION_API_KEY="\${EVOLUTION_API_KEY:-${EVOLUTION_API_KEY}}"
export DEPLOY_GIT_SHA="${DEPLOY_GIT_SHA}"
export DEPLOYED_AT="${DEPLOYED_AT}"
EOF
cat >> start-prod.sh <<'EOF'

DEPLOY_STAMP_FILE="/application/.deploy-sha"

install_deps_if_needed() {
  local need_install=0
  if [ ! -f "$DEPLOY_STAMP_FILE" ] || [ "$(cat "$DEPLOY_STAMP_FILE")" != "${DEPLOY_GIT_SHA}" ]; then
    need_install=1
  fi
  if ! find node_modules/argon2 -name 'argon2.node' -print -quit 2>/dev/null | grep -q .; then
    need_install=1
  fi
  if [ ! -f node_modules/.prisma/client/default.js ] 2>/dev/null; then
    need_install=1
  fi

  if [ "$need_install" -eq 1 ]; then
    echo "==> Install production dependencies (deploy ${DEPLOY_GIT_SHA})"
    rm -rf node_modules
    npm install --omit=dev --foreground-scripts
    npx prisma generate --schema apps/api/prisma/schema.prisma
    echo "${DEPLOY_GIT_SHA}" > "$DEPLOY_STAMP_FILE"
  else
    echo "==> Dependencies already installed for ${DEPLOY_GIT_SHA}"
  fi
}

install_deps_if_needed

echo "==> Start API"
exec node apps/api/dist/main.js
EOF
chmod +x start-prod.sh

printf '%s\n' "${CI_DATABASE_URL}" > .ci-migrate-database-url

echo "==> Deploy artifacts ready (client.p12 + start-prod.sh)"
echo "  CI migrate p12: ${P12_PATH_CI}"
echo "  Production p12: ${P12_PATH_PROD}"
echo "  DATABASE_URL host: $(python3 -c "from urllib.parse import urlparse; print(urlparse('''${PRODUCTION_DATABASE_URL}''').hostname)")"
