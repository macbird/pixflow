#!/usr/bin/env bash
# Builds a prebuilt zip for Square Cloud (dist + fresh production node_modules).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PKG_DIR="${ROOT_DIR}/deploy/artifacts/pixflow-prebuilt-pkg"
ZIP="${ROOT_DIR}/deploy/artifacts/pixflow-prebuilt.zip"
MAX_ZIP_BYTES=$((85 * 1024 * 1024))

require_file() {
  local path="$1"
  local label="$2"
  if [ -z "${path}" ] || [ ! -e "${path}" ]; then
    echo "::error::Missing ${label}: ${path}" >&2
    exit 1
  fi
}

echo "==> Validating build outputs"
require_file client.p12 "client.p12"
require_file start-prod.sh "start-prod.sh"
require_file squarecloud.app "squarecloud.app"
require_file package.json "package.json"
require_file apps/api/dist/main.js "API dist"
require_file apps/web/dist/index.html "Web dist"
require_file packages/shared/dist/index.js "Shared dist"

if ! grep -q '^MEMORY=512' squarecloud.app; then
  echo "::error::squarecloud.app must use MEMORY=512" >&2
  exit 1
fi

mkdir -p deploy/artifacts
rm -rf "$PKG_DIR" "$ZIP"
mkdir -p "$PKG_DIR"

echo "==> Copying app tree (no node_modules)"
cp package.json squarecloud.app start-prod.sh client.p12 "$PKG_DIR/"

mkdir -p "$PKG_DIR/packages/shared"
cp packages/shared/package.json "$PKG_DIR/packages/shared/"
rsync -a --exclude '*.map' packages/shared/dist "$PKG_DIR/packages/shared/"

mkdir -p "$PKG_DIR/apps/api"
cp apps/api/package.json "$PKG_DIR/apps/api/"
rsync -a --exclude '*.map' apps/api/dist "$PKG_DIR/apps/api/"
rsync -a apps/api/prisma "$PKG_DIR/apps/api/"

mkdir -p "$PKG_DIR/apps/web"
if [ -f apps/web/package.json ]; then
  cp apps/web/package.json "$PKG_DIR/apps/web/"
fi
rsync -a apps/web/dist "$PKG_DIR/apps/web/"

echo "==> Fresh production install inside package dir"
(
  cd "$PKG_DIR"
  npm install --omit=dev --foreground-scripts
  npx prisma generate --schema apps/api/prisma/schema.prisma
)

ARGON2_NODE="$(find "$PKG_DIR/node_modules/argon2" -name 'argon2.node' -print -quit 2>/dev/null || true)"
if [ -z "${ARGON2_NODE}" ]; then
  echo "::error::Missing argon2 native binding in package node_modules" >&2
  exit 1
fi
echo "argon2 OK: ${ARGON2_NODE}"

require_file "$PKG_DIR/node_modules/.prisma/client/default.js" "Prisma client"

echo "==> Creating zip"
(cd "$PKG_DIR" && zip -qr "$ZIP" .)

ls -lh "$ZIP"
ZIP_BYTES="$(wc -c < "$ZIP" | tr -d ' ')"
ZIP_MB="$(du -m "$ZIP" | awk '{print $1}')"
echo "zip size: ${ZIP_MB}MB (${ZIP_BYTES} bytes)"
if [ "${ZIP_BYTES}" -ge "${MAX_ZIP_BYTES}" ]; then
  echo "::error::Package exceeds ${MAX_ZIP_BYTES} bytes — Square Cloud rejects large commits (CLUSTER_COMMIT_FAILED)" >&2
  exit 1
fi

echo "==> Package sanity check"
ZIP_LIST="$(mktemp)"
trap 'rm -f "$ZIP_LIST"' EXIT
unzip -l "$ZIP" > "$ZIP_LIST"
for required in \
  squarecloud.app \
  start-prod.sh \
  client.p12 \
  apps/api/dist/main.js \
  apps/web/dist/index.html \
  node_modules/.prisma/client/default.js; do
  if ! grep -Fq "$required" "$ZIP_LIST"; then
    echo "::error::Missing ${required} in zip" >&2
    exit 1
  fi
done

echo "PIXFLOW_PACKAGE=${ZIP}"
