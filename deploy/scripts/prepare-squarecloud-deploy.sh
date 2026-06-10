#!/usr/bin/env bash
# Prepares Square Cloud deploy artifacts from GitHub secrets (no API calls).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "::error::Missing required env var: $name" >&2
    exit 1
  fi
}

require_env DATABASE_URL
require_env CLIENT_P12_BASE64
require_env JWT_SECRET

API_PUBLIC_BASE_URL="${API_PUBLIC_BASE_URL:-https://pixflow.squareweb.app}"
CRED_KEY="${CREDENTIALS_ENCRYPTION_KEY:-$JWT_SECRET}"
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
export DEPLOY_GIT_SHA="${DEPLOY_GIT_SHA}"
export DEPLOYED_AT="${DEPLOYED_AT}"
EOF
cat >> start-prod.sh <<'EOF'

echo "==> Install production dependencies"
ARGON2_BINDING="node_modules/argon2/lib/binding/napi-v3/argon2.node"
if [ ! -f "$ARGON2_BINDING" ]; then
  echo "Missing argon2 native binding — reinstalling node_modules"
  rm -rf node_modules
fi
npm install --omit=dev --foreground-scripts

if [ ! -f "$ARGON2_BINDING" ]; then
  echo "::error::argon2 native binding still missing after npm install"
  ls -la node_modules/argon2/lib/binding/ 2>/dev/null || true
  exit 1
fi

echo "==> Start API"
exec node apps/api/dist/main.js
EOF
chmod +x start-prod.sh

printf '%s\n' "${CI_DATABASE_URL}" > .ci-migrate-database-url

echo "==> Deploy artifacts ready (client.p12 + start-prod.sh)"
echo "  CI migrate p12: ${P12_PATH_CI}"
echo "  Production p12: ${P12_PATH_PROD}"
echo "  DATABASE_URL host: $(python3 -c "from urllib.parse import urlparse; print(urlparse('''${PRODUCTION_DATABASE_URL}''').hostname)")"
