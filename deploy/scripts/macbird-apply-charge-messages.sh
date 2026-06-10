#!/usr/bin/env bash
# Apply billing automation + charge messages on macbird (migrate, build, restart dev).
set -euo pipefail

ROOT="${ROOT:-$HOME/projetos/client-manager}"
cd "$ROOT"

# shellcheck disable=SC1091
if [ -f "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
fi
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:${PATH:-/usr/bin:/bin}"

export DATABASE_URL="${DATABASE_URL:-postgresql://cmuser:cm_prod_2026@127.0.0.1:5432/client_manager?schema=public}"

echo "==> Build shared"
npm run build -w packages/shared

echo "==> Prisma migrate deploy"
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "==> Prisma generate"
npx prisma generate --schema apps/api/prisma/schema.prisma

echo "==> Restart dev stack"
find "$ROOT/deploy/scripts" -maxdepth 1 -name '*.sh' -exec sed -i 's/\r$//' {} +
bash "$ROOT/deploy/scripts/macbird-dev-evolution.sh"

echo "==> Done. Open http://$(hostname -I 2>/dev/null | awk '{print $1}'):5173/settings"
