#!/usr/bin/env bash
set -euo pipefail

WIN_ROOT="/mnt/c/Users/jpaulosi/projetos/client-manager"
REMOTE="macbird@192.168.18.88"
REMOTE_ROOT="~/projetos/client-manager"

if [ "$#" -eq 0 ]; then
  echo "Usage: wsl_sync_files.sh <relative-file> [more-files...]"
  exit 1
fi

export SSH_ASKPASS_REQUIRE=force
export DISPLAY=:0
cat > /tmp/ssh_pass.sh <<'PASS'
#!/bin/sh
echo y478vk92k39
PASS
chmod +x /tmp/ssh_pass.sh
export SSH_ASKPASS=/tmp/ssh_pass.sh

SSH_OPTS=(-o StrictHostKeyChecking=no)

for rel in "$@"; do
  local_path="${WIN_ROOT}/${rel}"
  if [ ! -f "${local_path}" ]; then
    echo "ERROR: file not found: ${rel}"
    exit 1
  fi
  echo "==> Sync ${rel}"
  scp "${SSH_OPTS[@]}" "${local_path}" "${REMOTE}:${REMOTE_ROOT}/${rel}"
done

echo "==> Done ($# file(s))"
