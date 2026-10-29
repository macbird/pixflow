# Deploy no MACBIRD

Todo o deploy roda **no MACBIRD** (`192.168.18.88`).  
**Não** use scripts Python/Paramiko no notebook corporativo — isso gerou alerta no CrowdStrike.

## Pré-requisitos (uma vez no MACBIRD)

```bash
git clone <url-do-repo> ~/client-manager
cd ~/client-manager
```

## Square Cloud — pipeline (GitHub Actions)

Push em `main` → `.github/workflows/deploy.yml`

| Step | O que faz |
|------|-----------|
| 1. Install + Build | `npm install` + `npm run build` (Node 24) |
| 2. Prepare | `client.p12` + `start-prod.sh` + env vars |
| 3. Migrations | `prisma migrate deploy` no CI (com p12 local) |
| 4. Slim zip | `dist` + `package.json` + prisma — **sem node_modules** (~5–15MB) |
| 5. Commit + restart | API Square Cloud (`MEMORY=512`) + `POST /apps/{id}/restart` |
| 6. Verify | `/health` + `/health/db` (até ~10 min no 1º boot) |

### Por que zip slim?

Testes na API Square Cloud (macbird):

- Zip **~1KB** + `MEMORY=512` → sucesso
- Zip **~88MB** com `node_modules` → `CLUSTER_COMMIT_FAILED` (400)
- Plano **standard-4** sem RAM livre → `MEMORY` no zip deve ser **512**

Monorepo com `node_modules` no zip **não cabe** no commit da Square Cloud.

### Boot da app

`start-prod.sh` instala deps **só quando o SHA do deploy muda** (ou se faltam argon2/prisma):

```bash
npm install --omit=dev → prisma generate → node apps/api/dist/main.js
```

Restarts do mesmo deploy **não** reinstalam.

### Fail-fast

- `bash -euo pipefail` em todos os steps
- Commit via API com JSON de erro explícito
- Verify só roda se commit passou (`if: success()`)

### Diagnóstico

```bash
squarecloud app status 09455ba819f445af9c92a3d8319e26b4
squarecloud app logs 09455ba819f445af9c92a3d8319e26b4 | tail -80
curl -sS https://pixflow.squareweb.app/health
```

## Deploy local (macbird)

```bash
cd ~/client-manager
./deploy/scripts/deploy-all.sh
```

## Credenciais

Use `deploy/CREDENTIALS.local.md` localmente (gitignored).

## Rotação de senha do Postgres (app não sobe)

Sintoma: a Square Cloud girou a senha do banco → o `DATABASE_URL` embutido no
deploy fica velho → a app não conecta e a página mostra "took too long to
respond" / `/health/db` retorna `ok:false`.

### Modo recomendado: autoprovisionamento (à prova de rotação)

Em vez de manter os secrets `DATABASE_URL` e `CLIENT_P12_BASE64` à mão (que
quebram a cada rotação), deixe o pipeline gerar as credenciais a cada deploy a
partir do **token de API** (que não gira):

1. Em **Settings → Secrets → Actions**, defina `SQUARE_CLOUD_DATABASE_ID`
   (o id do banco, ex.: `30b40510823f45d9b12fcfc694e95f27`).
   `SQUARE_CLOUD_API_TOKEN` já existe.
2. Faça um push em `main` (ou re-rode o workflow). O step **Prepare** reseta a
   senha, busca o certificado atual e monta `DATABASE_URL` + `client.p12`
   sozinho. Os secrets `DATABASE_URL`/`CLIENT_P12_BASE64` passam a ser ignorados.

Enquanto `SQUARE_CLOUD_DATABASE_ID` **não** estiver definido, o pipeline usa o
caminho antigo (secrets `DATABASE_URL`/`CLIENT_P12_BASE64`) — sem mudança de
comportamento.

### Recuperação manual (sem habilitar o autoprovisionamento)

```bash
export SQUARE_CLOUD_API_TOKEN=...
export SQUARE_CLOUD_DATABASE_ID=30b40510823f45d9b12fcfc694e95f27
RESET_PASSWORD=1 bash deploy/scripts/rotate-squarecloud-db-credentials.sh
```

O script imprime os novos `DATABASE_URL` e `CLIENT_P12_BASE64`. Atualize os dois
secrets no GitHub e re-rode o deploy (push em `main`).
