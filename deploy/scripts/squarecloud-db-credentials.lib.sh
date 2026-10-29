#!/usr/bin/env bash
# Shared helpers for deriving Square Cloud managed-Postgres credentials from the
# Square Cloud API. Source this file; do not execute it directly.
#
# Requires in the environment:
#   SQUARE_CLOUD_API_TOKEN   — Square Cloud API token (stable; survives DB password rotation)
# Optional overrides:
#   SQUARE_CLOUD_API_BASE    — API base URL (default: https://api.squarecloud.app/v2)
#   SQUARE_CLOUD_P12_PASSWORD— PKCS#12 export password (default: squarecloud)
#
# The Square Cloud DB password rotates (manually or by the platform). The API
# token does not, so these helpers let the deploy pipeline mint fresh, valid
# credentials on every run instead of depending on a hand-maintained secret that
# silently goes stale and takes the app down on the next boot.

SQUARE_CLOUD_API_BASE="${SQUARE_CLOUD_API_BASE:-https://api.squarecloud.app/v2}"
SQUARE_CLOUD_P12_PASSWORD="${SQUARE_CLOUD_P12_PASSWORD:-squarecloud}"
# Reset endpoints are rate-limited to 1 every 3s per user; wait a bit longer
# between consecutive resets (e.g. password then certificate).
SQUARE_CLOUD_RESET_COOLDOWN="${SQUARE_CLOUD_RESET_COOLDOWN:-4}"

# Directory of this library, so callers can be invoked from anywhere.
SQUARE_CLOUD_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

sqcloud_require_token() {
  if [ -z "${SQUARE_CLOUD_API_TOKEN:-}" ]; then
    echo "::error::SQUARE_CLOUD_API_TOKEN is required" >&2
    return 1
  fi
}

# sqcloud_reset_db_password <database_id>
# Resets the DB password via the Square Cloud API and prints the new password to stdout.
sqcloud_reset_db_password() {
  local db_id="$1"
  if [ -z "$db_id" ]; then
    echo "::error::sqcloud_reset_db_password: missing database id" >&2
    return 1
  fi
  sqcloud_require_token || return 1

  local reset_json
  reset_json="$(curl -sS -m 30 -X POST \
    -H "Authorization: ${SQUARE_CLOUD_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"reset":"password"}' \
    "${SQUARE_CLOUD_API_BASE}/databases/${db_id}/credentials/reset")"

  local password
  password="$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("response",{}).get("password",""))' <<<"$reset_json")"
  if [ -z "$password" ]; then
    echo "::error::Square Cloud password reset did not return a password" >&2
    echo "$reset_json" >&2
    return 1
  fi
  printf '%s' "$password"
}

# sqcloud_reset_certificate <database_id>
# Rotates the TLS certificate via the Square Cloud API. The API returns only a
# success status; the new certificate must be fetched afterwards with
# sqcloud_write_client_p12. The database must be running.
sqcloud_reset_certificate() {
  local db_id="$1"
  if [ -z "$db_id" ]; then
    echo "::error::sqcloud_reset_certificate: missing database id" >&2
    return 1
  fi
  sqcloud_require_token || return 1

  local reset_json status
  reset_json="$(curl -sS -m 30 -X POST \
    -H "Authorization: ${SQUARE_CLOUD_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"reset":"certificate"}' \
    "${SQUARE_CLOUD_API_BASE}/databases/${db_id}/credentials/reset")"

  status="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("status",""))' <<<"$reset_json" 2>/dev/null || true)"
  if [ "$status" != "success" ]; then
    echo "::error::Square Cloud certificate reset failed" >&2
    echo "$reset_json" >&2
    return 1
  fi
}

# sqcloud_write_client_p12 <database_id> <output_p12_path>
# Fetches the current client certificate and writes a Prisma-compatible client.p12.
sqcloud_write_client_p12() {
  local db_id="$1"
  local out_p12="$2"
  if [ -z "$db_id" ] || [ -z "$out_p12" ]; then
    echo "::error::sqcloud_write_client_p12: missing database id or output path" >&2
    return 1
  fi
  sqcloud_require_token || return 1

  local cert_json http
  cert_json="$(mktemp)"
  http="$(curl -sS -m 30 -o "$cert_json" -w '%{http_code}' \
    -H "Authorization: ${SQUARE_CLOUD_API_TOKEN}" \
    "${SQUARE_CLOUD_API_BASE}/databases/${db_id}/credentials/certificate")"
  if [ "$http" != "200" ]; then
    echo "::error::Square Cloud certificate API HTTP ${http}" >&2
    cat "$cert_json" >&2
    rm -f "$cert_json"
    return 1
  fi

  if ! SQUARE_CLOUD_P12_PASSWORD="$SQUARE_CLOUD_P12_PASSWORD" \
    python3 "${SQUARE_CLOUD_LIB_DIR}/build-squarecloud-p12.py" "$cert_json" "$out_p12"; then
    rm -f "$cert_json"
    return 1
  fi
  rm -f "$cert_json"
}

# sqcloud_build_database_url <password> [host] [port] [db] [user]
# Prints a base DATABASE_URL (TLS params are added later by the deploy script).
sqcloud_build_database_url() {
  local password="$1"
  local host="${2:-}"
  local port="${3:-7247}"
  local db="${4:-squarecloud}"
  local user="${5:-squarecloud}"
  if [ -z "$password" ] || [ -z "$host" ]; then
    echo "::error::sqcloud_build_database_url: missing password or host" >&2
    return 1
  fi
  printf 'postgresql://%s:%s@%s:%s/%s?schema=public' \
    "$user" "$password" "$host" "$port" "$db"
}
