MAIN=apps/api/dist/main.js
MEMORY=1024
VERSION=recommended
DISPLAY_NAME=client-manager
DESCRIPTION=Unified Client Manager (API + Web)
SUBDOMAIN=iptv-manager
AUTORESTART=true
START=npx prisma generate --schema apps/api/prisma/schema.prisma && npx prisma migrate deploy --schema apps/api/prisma/schema.prisma && npm run start
