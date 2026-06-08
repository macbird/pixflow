#!/usr/bin/env bash
# Generated at deploy time by deploy/scripts/prepare-squarecloud-deploy.sh (GitHub Actions).
# Do not commit start-prod.sh or client.p12 — they are created on each deploy from secrets.
#
# Required GitHub Secrets:
#   DATABASE_URL       — Postgres URL from Square Cloud dashboard (password must be current)
#   CLIENT_P12_BASE64  — base64 of client.p12 (generate with rotate-squarecloud-db-credentials.sh)
#   JWT_SECRET, CREDENTIALS_ENCRYPTION_KEY, SQUARE_CLOUD_API_TOKEN, SQUARE_CLOUD_APP_ID
set -euo pipefail

export PORT="${PORT:-80}"
export NODE_ENV="${NODE_ENV:-production}"
export DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
export JWT_SECRET="${JWT_SECRET:?JWT_SECRET is required}"
export CREDENTIALS_ENCRYPTION_KEY="${CREDENTIALS_ENCRYPTION_KEY:-$JWT_SECRET}"
export API_PUBLIC_BASE_URL="${API_PUBLIC_BASE_URL:-https://pixflow.squareweb.app}"
exec node apps/api/dist/main.js
