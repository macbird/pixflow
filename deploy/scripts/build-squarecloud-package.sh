#!/usr/bin/env bash
# Builds a prebuilt zip for Square Cloud (dist + production node_modules + runtime files).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PKG_DIR="${ROOT_DIR}/deploy/artifacts/pixflow-prebuilt-pkg"
ZIP="${ROOT_DIR}/deploy/artifacts/pixflow-prebuilt.zip"

require_file() {
  local path="$1"
  local label="$2"
  if [ ! -e "$path" ]; then
    echo "::error::Missing ${label}: ${path}" >&2
    exit 1
  fi
}

echo "==> Validating deploy inputs"
require_file client.p12 "client.p12"
require_file start-prod.sh "start-prod.sh"
require_file squarecloud.app "squarecloud.app"
require_file package.json "package.json"
require_file apps/api/dist/main.js "API dist"
require_file apps/web/dist/index.html "Web dist"
require_file packages/shared/dist/index.js "Shared dist"

ARGON2_NODE="$(find node_modules/argon2 -name 'argon2.node' -print -quit 2>/dev/null || true)"
if [ -z "${ARGON2_NODE}" ]; then
  echo "::error::Missing argon2 native binding in node_modules" >&2
  exit 1
fi
echo "Using argon2 binding: ${ARGON2_NODE}"

if [ ! -f node_modules/.prisma/client/default.js ] && [ ! -f node_modules/.prisma/client/index.js ]; then
  echo "::error::Missing generated Prisma client in node_modules/.prisma/client" >&2
  exit 1
fi
echo "Prisma client bundle OK"

mkdir -p deploy/artifacts
rm -rf "$PKG_DIR" "$ZIP"
mkdir -p "$PKG_DIR"

echo "==> Copying runtime files"
cp package.json start-prod.sh client.p12 "$PKG_DIR/"
cp squarecloud.app "$PKG_DIR/"
if ! grep -q '^MEMORY=512' "$PKG_DIR/squarecloud.app"; then
  echo "::error::squarecloud.app MEMORY must be 512 for current plan/app allocation" >&2
  exit 1
fi

echo "==> Copying production node_modules (slim — no Prisma CLI / dev tools)"
rsync -a \
  --exclude 'node_modules/prisma/' \
  --exclude 'typescript/' \
  --exclude 'vitest/' \
  --exclude '@types/' \
  --exclude '*.map' \
  --exclude '*/test/*' \
  --exclude '*/tests/*' \
  --exclude '.cache/' \
  --exclude 'coverage/' \
  node_modules "$PKG_DIR/"

echo "==> Copying packages/shared"
mkdir -p "$PKG_DIR/packages/shared"
cp packages/shared/package.json "$PKG_DIR/packages/shared/"
rsync -a --exclude '*.map' packages/shared/dist "$PKG_DIR/packages/shared/"

echo "==> Copying apps/api"
mkdir -p "$PKG_DIR/apps/api"
cp apps/api/package.json "$PKG_DIR/apps/api/"
rsync -a --exclude '*.map' apps/api/dist "$PKG_DIR/apps/api/"
rsync -a apps/api/prisma "$PKG_DIR/apps/api/"

echo "==> Copying apps/web"
mkdir -p "$PKG_DIR/apps/web"
if [ -f apps/web/package.json ]; then
  cp apps/web/package.json "$PKG_DIR/apps/web/"
fi
rsync -a apps/web/dist "$PKG_DIR/apps/web/"

echo "==> Creating zip"
(cd "$PKG_DIR" && zip -qr "$ZIP" .)

ls -lh "$ZIP"
ZIP_MB="$(du -m "$ZIP" | awk '{print $1}')"
ZIP_BYTES="$(wc -c < "$ZIP" | tr -d ' ')"
echo "zip size: ${ZIP_MB}MB (${ZIP_BYTES} bytes)"
if [ "${ZIP_MB}" -ge 95 ]; then
  echo "::error::Package is ${ZIP_MB}MB — Square Cloud commit limit is ~100MB; slim the bundle further" >&2
  exit 1
fi
du -sh "$PKG_DIR/node_modules" | awk '{print "node_modules in package:", $1}'

echo "==> Package sanity check"
ZIP_LIST="$(mktemp)"
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
rm -f "$ZIP_LIST"

echo "PIXFLOW_PACKAGE=${ZIP}"
