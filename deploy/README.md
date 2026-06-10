# Deploy no MACBIRD

Todo o deploy roda **no MACBIRD** (`192.168.18.88`).  
**Não** use scripts Python/Paramiko no notebook corporativo — isso gerou alerta no CrowdStrike.

## Pré-requisitos (uma vez no MACBIRD)

```bash
# Clone do repositório
git clone <url-do-repo> ~/client-manager
cd ~/client-manager

# Node via nvm (v20.20.2), pm2, squarecloud CLI, postgres, cloudflared
# já configurados no ambiente de produção
```

## Square Cloud (GitHub Actions)

Push em `main` dispara `.github/workflows/deploy.yml`:

1. **Build** no runner
2. **`prisma migrate deploy`** no CI (antes do restart — app antigo continua no ar)
3. **`squarecloud app commit --restart`**
4. **Health gate** com retries (~5 min)
5. **Rollback automático** para o commit anterior se o health falhar

O `start-prod.sh` roda `npm ci --omit=dev` no boot (corrige deps como `node-cron`).

Diagnóstico na macbird:

```bash
squarecloud app status 09455ba819f445af9c92a3d8319e26b4
squarecloud app logs 09455ba819f445af9c92a3d8319e26b4 | tail -80
```

## Deploy completo (macbird local)

Conecte no MACBIRD (SSH ou console local) e execute:

```bash
cd ~/client-manager
chmod +x deploy/scripts/*.sh
./deploy/scripts/deploy-all.sh
```

O script faz, **no MACBIRD**:

1. `git pull` (branch `main`)
2. `npm install`, Prisma migrate, PM2 API (`start:ts`)
3. Cloudflared Quick Tunnel (se necessário)
4. Build da web + commit na Square Cloud

## Comandos úteis (sempre no MACBIRD)

```bash
# Só API
./deploy/scripts/macbird-run-api.sh

# Só web (requer api_public_url.txt)
./deploy/scripts/macbird-deploy-web.sh

# Status (health só em localhost)
./deploy/scripts/status.sh

# Deploy sem git pull (código já atualizado)
SKIP_GIT_PULL=1 ./deploy/scripts/deploy-all.sh
```

## Atualizar código antes do deploy

No seu ambiente de desenvolvimento, faça `git push`.  
No MACBIRD, `deploy-all.sh` puxa automaticamente.

## O que NÃO fazer no notebook corporativo

- `python deploy/macbird-deploy.py`
- `python deploy/remote-*.py`
- `python -c` com Paramiko + senha SSH
- `curl` para `*.trycloudflare.com` a partir da máquina NTTD

## Artefatos

Logs e URLs ficam em `deploy/artifacts/` (gitignored):

- `api_public_url.txt` — URL atual do túnel
- `deploy-summary.txt` — resumo do último deploy
- `macbird-api.log` / `macbird-web.log`

## Credenciais

Use `deploy/CREDENTIALS.local.md` apenas localmente (gitignored).  
Não commitar senhas nem tokens.

## Dev no MACBIRD (API + Vite, Evolution produção)

Sync a partir do notebook (WSL):

```bash
bash /mnt/c/Users/jpaulosi/projetos/client-manager/wsl_sync_macbird.sh
```

Ou no MACBIRD após `git pull`:

```bash
cd ~/projetos/client-manager
bash deploy/scripts/macbird-apply-charge-messages.sh
```

O stack dev usa `BILLING_SCHEDULER_INTERVAL_MINUTES=10` (todos os tenants ativos a cada 10 min).  
Documentação completa: [docs/iptv-manager/12-billing-automation-scheduler.md](../docs/iptv-manager/12-billing-automation-scheduler.md).
