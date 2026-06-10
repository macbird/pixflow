#!/usr/bin/env bash
# Ensures production node_modules are ready for Square Cloud (native bindings, etc.).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "==> Prune dev dependencies"
npm prune --omit=dev

find_argon2_binding() {
  find node_modules/argon2 -name 'argon2.node' -print -quit 2>/dev/null || true
}

ARGON2_NODE="$(find_argon2_binding)"
if [ -z "${ARGON2_NODE}" ]; then
  echo "==> Rebuilding argon2 native binding"
  npm rebuild argon2 --foreground-scripts
  ARGON2_NODE="$(find_argon2_binding)"
fi

if [ -z "${ARGON2_NODE}" ]; then
  echo "::error::argon2 native binding not found after npm prune/rebuild" >&2
  find node_modules/argon2 -maxdepth 5 -type f 2>/dev/null | head -20 || true
  exit 1
fi

echo "argon2 native binding OK: ${ARGON2_NODE}"
du -sh node_modules | awk '{print "node_modules size:", $1}'
