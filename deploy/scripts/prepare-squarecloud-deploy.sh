#!/usr/bin/env bash
# Prepares Square Cloud deploy artifacts: client.p12, DATABASE_URL, start-prod.sh
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

require_env SQUARE_CLOUD_API_TOKEN
require_env SQUARE_CLOUD_DATABASE_ID
require_env DATABASE_URL
require_env JWT_SECRET

API_PUBLIC_BASE_URL="${API_PUBLIC_BASE_URL:-https://pixflow.squareweb.app}"
CRED_KEY="${CREDENTIALS_ENCRYPTION_KEY:-$JWT_SECRET}"
P12_PASSWORD="${SQUARE_CLOUD_P12_PASSWORD:-squarecloud}"
P12_PATH="${SQUARE_CLOUD_P12_PATH:-/application/client.p12}"
CERT_JSON="$(mktemp)"
trap 'rm -f "$CERT_JSON"' EXIT

echo "==> Fetching database certificate from Square Cloud API"
HTTP_CODE="$(curl -sS -m 30 -o "$CERT_JSON" -w "%{http_code}" \
  -H "Authorization: ${SQUARE_CLOUD_API_TOKEN}" \
  "https://api.squarecloud.app/v2/databases/${SQUARE_CLOUD_DATABASE_ID}/credentials/certificate")"
if [ "$HTTP_CODE" != "200" ]; then
  echo "::error::Certificate API returned HTTP ${HTTP_CODE}" >&2
  cat "$CERT_JSON" >&2 || true
  exit 1
fi

python3 deploy/scripts/build-squarecloud-p12.py "$CERT_JSON" client.p12

echo "==> Building production DATABASE_URL"
export P12_PATH P12_PASSWORD
PRODUCTION_DATABASE_URL="$(python3 <<PY
import os
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

raw = os.environ["DATABASE_URL"].strip()
p12_path = os.environ["P12_PATH"]
p12_password = os.environ["P12_PASSWORD"]
parsed = urlparse(raw)

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
)"

echo "==> Writing start-prod.sh"
cat > start-prod.sh <<EOF
#!/usr/bin/env bash
set -euo pipefail
export PORT="\${PORT:-80}"
export NODE_ENV="\${NODE_ENV:-production}"
export DATABASE_URL="\${DATABASE_URL:-${PRODUCTION_DATABASE_URL}}"
export JWT_SECRET="\${JWT_SECRET:-${JWT_SECRET}}"
export CREDENTIALS_ENCRYPTION_KEY="\${CREDENTIALS_ENCRYPTION_KEY:-${CRED_KEY}}"
export API_PUBLIC_BASE_URL="\${API_PUBLIC_BASE_URL:-${API_PUBLIC_BASE_URL}}"
exec node apps/api/dist/main.js
EOF
chmod +x start-prod.sh

echo "==> Deploy artifacts ready"
echo "  - client.p12"
echo "  - start-prod.sh"
echo "  - DATABASE_URL host: $(python3 -c "from urllib.parse import urlparse; print(urlparse('''${PRODUCTION_DATABASE_URL}''').hostname)")"
