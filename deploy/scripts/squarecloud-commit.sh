#!/usr/bin/env bash
# Upload zip to Square Cloud via API (explicit JSON errors, retry on rate limit).
set -euo pipefail

APP_ID="${SQUARE_CLOUD_APP_ID:?SQUARE_CLOUD_APP_ID is required}"
TOKEN="${SQUARE_CLOUD_API_TOKEN:?SQUARE_CLOUD_API_TOKEN is required}"
ZIP="${1:?Usage: squarecloud-commit.sh <path-to-zip>}"
API="https://api.squarecloud.app/v2/apps/${APP_ID}/commit"

if [ ! -f "$ZIP" ]; then
  echo "::error::Zip not found: $ZIP" >&2
  exit 1
fi

RESP_FILE="$(mktemp)"
trap 'rm -f "$RESP_FILE"' EXIT

report_failure() {
  local reason="$1"
  local http="${2:-unknown}"

  echo "::error::${reason}" >&2
  echo ""
  echo "========================================"
  echo " Square Cloud commit FAILED"
  echo " Reason: ${reason}"
  echo " HTTP: ${http}"
  echo "========================================"
  echo ""
  echo "=== Package ==="
  ls -lh "$ZIP"
  wc -c "$ZIP" | awk '{print "bytes:", $1}'
  echo ""
  echo "=== squarecloud.app ==="
  unzip -p "$ZIP" squarecloud.app 2>/dev/null || echo "(missing)"
  echo ""
  echo "=== API response ==="
  cat "$RESP_FILE" 2>/dev/null || echo "(empty)"
  echo ""

  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    {
      echo "## Square Cloud commit FAILED"
      echo ""
      echo "**Reason:** ${reason}"
      echo "**HTTP:** ${http}"
      echo ""
      echo "### API response"
      echo '```json'
      cat "$RESP_FILE" 2>/dev/null || echo "(empty)"
      echo '```'
    } >> "${GITHUB_STEP_SUMMARY}"
  fi

  exit 1
}

ZIP_BYTES="$(wc -c < "$ZIP" | tr -d ' \n')"
echo "Committing ${ZIP} (${ZIP_BYTES} bytes) to app ${APP_ID}"
echo "squarecloud.app:"
unzip -p "$ZIP" squarecloud.app

HTTP=""
for attempt in 1 2 3 4 5 6; do
  echo "==> Commit attempt ${attempt}/6"
  HTTP="$(curl -sS -m 600 -o "$RESP_FILE" -w '%{http_code}' \
    -H "Authorization: ${TOKEN}" \
    -F "file=@${ZIP}" \
    "${API}")"
  echo "HTTP ${HTTP}"
  cat "$RESP_FILE"
  echo

  if [ "$HTTP" = "429" ]; then
    echo "Rate limited (KEEP_CALM) — waiting 12s..."
    sleep 12
    continue
  fi
  break
done

if [ "$HTTP" != "200" ]; then
  CODE="$(python3 -c "import json; print(json.load(open('${RESP_FILE}')).get('code',''))" 2>/dev/null || true)"
  MSG="$(python3 -c "import json; print(json.load(open('${RESP_FILE}')).get('message',''))" 2>/dev/null || true)"
  report_failure "Square Cloud API error code=${CODE} message=${MSG}" "$HTTP"
fi

if ! python3 -c "import json,sys; d=json.load(open('${RESP_FILE}')); sys.exit(0 if d.get('status')=='success' else 1)"; then
  report_failure "Square Cloud API returned non-success status" "$HTTP"
fi

echo "Square Cloud commit OK"
