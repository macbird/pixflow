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

COMMIT_LOG="$(mktemp)"
trap 'rm -f "$COMMIT_LOG"' EXIT

report_failure() {
  local reason="$1"

  echo "::error::${reason}" >&2
  echo ""
  echo "========================================"
  echo " Square Cloud commit FAILED"
  echo " Reason: ${reason}"
  echo "========================================"
  echo ""
  echo "=== CLI output (full) ==="
  if [ -s "$COMMIT_LOG" ]; then
    cat "$COMMIT_LOG"
  else
    echo "(empty)"
  fi
  echo ""
  echo "=== CLI error lines ==="
  grep -inE 'CLUSTER_COMMIT_FAILED|commit failed|error|400|fail|invalid|memory|ram|size|limit' "$COMMIT_LOG" 2>/dev/null || echo "(no matching error lines)"
  echo ""
  echo "=== Package ==="
  ls -lh "$ZIP"
  du -m "$ZIP" | awk '{print "zip size (MB):", $1}'
  echo ""
  echo "=== squarecloud.app inside zip ==="
  unzip -p "$ZIP" squarecloud.app 2>/dev/null || echo "(missing)"
  echo ""
  echo "=== zip entries (top 30) ==="
  unzip -l "$ZIP" 2>/dev/null | head -30 || true
  echo ""
  echo "=== App status via API ==="
  APP_HTTP="$(curl -sS -m 30 -o /tmp/sc_app_status.json -w '%{http_code}' \
    -H "Authorization: ${TOKEN}" \
    "https://api.squarecloud.app/v2/apps/${APP_ID}")"
  echo "GET /apps/${APP_ID} HTTP ${APP_HTTP}"
  if [ -f /tmp/sc_app_status.json ]; then
    cat /tmp/sc_app_status.json
    echo
  fi

  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    {
      echo "## Square Cloud commit FAILED"
      echo ""
      echo "**Reason:** ${reason}"
      echo ""
      echo "### CLI output"
      echo '```text'
      cat "$COMMIT_LOG" 2>/dev/null || echo "(empty)"
      echo '```'
      echo ""
      echo "### squarecloud.app in zip"
      echo '```ini'
      unzip -p "$ZIP" squarecloud.app 2>/dev/null || echo "(missing)"
      echo '```'
    } >> "${GITHUB_STEP_SUMMARY}"
  fi

  exit 1
}

ZIP_MB="$(du -m "$ZIP" | awk '{print $1}')"
echo "Committing ${ZIP} (${ZIP_MB}MB) to app ${APP_ID}"

npm install -g @squarecloud/cli
squarecloud auth login --token "$TOKEN"

echo "=== Running: squarecloud app commit ${APP_ID} --file ${ZIP} --restart ==="
set +e
squarecloud app commit "$APP_ID" --file "$ZIP" --restart 2>&1 | tee "$COMMIT_LOG"
CLI_EXIT="${PIPESTATUS[0]}"
set -e

echo "CLI exit code: ${CLI_EXIT}"

if [ "$CLI_EXIT" -ne 0 ]; then
  report_failure "squarecloud app commit exited with code ${CLI_EXIT}"
fi

if grep -qiE 'CLUSTER_COMMIT_FAILED|KEEP_CALM|"status"[[:space:]]*:[[:space:]]*"error"' "$COMMIT_LOG"; then
  MATCH="$(grep -iE 'CLUSTER_COMMIT_FAILED|KEEP_CALM|"status"[[:space:]]*:[[:space:]]*"error"' "$COMMIT_LOG" | head -5)"
  report_failure "Square Cloud commit error — ${MATCH}"
fi

echo "=== Square Cloud CLI output ==="
cat "$COMMIT_LOG"
echo "Square Cloud commit OK"
