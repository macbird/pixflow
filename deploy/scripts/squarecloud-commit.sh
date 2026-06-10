#!/usr/bin/env bash
# Uploads prebuilt zip to Square Cloud and fails on any commit error.
set -euo pipefail

APP_ID="${SQUARE_CLOUD_APP_ID:?SQUARE_CLOUD_APP_ID is required}"
TOKEN="${SQUARE_CLOUD_API_TOKEN:?SQUARE_CLOUD_API_TOKEN is required}"
ZIP="${1:?Usage: squarecloud-commit.sh <path-to-zip>}"

if [ ! -f "$ZIP" ]; then
  echo "::error::Zip not found: $ZIP" >&2
  exit 1
fi

fail() {
  echo "::error::$1" >&2
  exit 1
}

ZIP_MB="$(du -m "$ZIP" | awk '{print $1}')"
echo "Committing ${ZIP} (${ZIP_MB}MB) to app ${APP_ID}"

npm install -g @squarecloud/cli
squarecloud auth login --token "$TOKEN"

COMMIT_LOG="$(mktemp)"
trap 'rm -f "$COMMIT_LOG"' EXIT

set +e
squarecloud app commit "$APP_ID" --file "$ZIP" --restart 2>&1 | tee "$COMMIT_LOG"
CLI_EXIT="${PIPESTATUS[0]}"
set -e

if [ "$CLI_EXIT" -ne 0 ]; then
  fail "squarecloud app commit exited with code ${CLI_EXIT}"
fi

if grep -qiE 'CLUSTER_COMMIT_FAILED|commit failed|error code 400|status.?=.?error|HTTP 400' "$COMMIT_LOG"; then
  fail "Square Cloud commit reported failure in CLI output"
fi

echo "Square Cloud commit OK"
