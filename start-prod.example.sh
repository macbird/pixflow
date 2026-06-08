#!/usr/bin/env bash
# Generated at deploy time by GitHub Actions (deploy/scripts/prepare-squarecloud-deploy.sh).
# Do not commit start-prod.sh — it is created on each deploy with secrets embedded.
set -euo pipefail

export PORT="${PORT:-80}"
export NODE_ENV="${NODE_ENV:-production}"
export DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
export JWT_SECRET="${JWT_SECRET:?JWT_SECRET is required}"
export CREDENTIALS_ENCRYPTION_KEY="${CREDENTIALS_ENCRYPTION_KEY:-$JWT_SECRET}"
export API_PUBLIC_BASE_URL="${API_PUBLIC_BASE_URL:-https://pixflow.squareweb.app}"
exec node apps/api/dist/main.js
