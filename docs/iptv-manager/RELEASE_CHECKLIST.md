# Checklist de release — Cliente Manager

Checklist **enxuto** para publicar uma versão (staging ou produção). Marque cada item antes do deploy.

Relacionado: [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) · [09-improvements-p0-p1.md](./09-improvements-p0-p1.md)

---

## 1. Pré-requisitos (ambiente)

| # | Item | OK |
|---|------|:--:|
| 1.1 | PostgreSQL acessível; banco `client_manager` criado | ☐ |
| 1.2 | `DATABASE_URL` aponta para o banco correto (não `iptv_manager` em prod) | ☐ |
| 1.3 | `JWT_SECRET` definido (mín. 32 caracteres aleatórios); **sem** fallback `supersecret` | ☐ |
| 1.4 | API: `PORT` definido (padrão `3001`) | ☐ |
| 1.5 | Web: `VITE_API_URL` aponta para a URL pública da API (ex.: `https://api.seudominio.com/api`) | ☐ |
| 1.6 | CORS em produção restrito à origem do front (não `origin: true`) | ☐ |
| 1.7 | Secrets **não** commitados (`.env` no `.gitignore`) | ☐ |

---

## 2. Banco de dados

| # | Item | OK |
|---|------|:--:|
| 2.1 | Backup do banco antes do deploy (dump ou snapshot) | ☐ |
| 2.2 | `npx prisma migrate deploy` executado no ambiente alvo | ☐ |
| 2.3 | `npx prisma generate` após migrate (se build da API for separado) | ☐ |
| 2.4 | Seed apenas se ambiente novo (`seed-admin`, `seed-infrastructure` — **não** em prod com dados reais sem revisão) | ☐ |
| 2.5 | Conta admin plataforma existe e senha não é a default de dev | ☐ |

---

## 3. Build e artefatos

| # | Comando / ação | OK |
|---|----------------|:--:|
| 3.1 | `npm install` na raiz do monorepo | ☐ |
| 3.2 | `npm run build` (shared → api → web, na ordem) | ☐ |
| 3.3 | Build da web sem erros TypeScript (`tsc`) | ☐ |
| 3.4 | Build da API sem erros (`apps/api`) | ☐ |
| 3.5 | Assets PWA gerados (`vite build` + manifest) | ☐ |

```bash
# Na raiz do repositório
npm install
npm run build
```

---

## 4. Segurança (mínimo para go-live)

| # | Item | OK |
|---|------|:--:|
| 4.1 | HTTPS no front e na API (reverse proxy: Nginx/Caddy/Traefik) | ☐ |
| 4.2 | Senhas de tenant e `PlatformAdmin` com argon2 (já no código — validar seed) | ☐ |
| 4.3 | Tokens tenant (`token`) e admin (`adminToken`) isolados; interceptor `/admin` ok | ☐ |
| 4.4 | Conta suspensa (`AccountStatus.suspended`) bloqueia login do tenant | ☐ |
| 4.5 | Revisar se `console.log` de debug foi removido da API (ex.: auth) | ☐ |
| 4.6 | Rate limit no login (recomendado — pode ser P1 pós-release) | ☐ |

---

## 5. Smoke tests manuais (tenant)

Executar com um usuário tenant real ou de staging.

| # | Fluxo | OK |
|---|-------|:--:|
| 5.1 | `GET /health` → `{ status: 'ok', db: 'ok' }` (503 se DB falhar) | ☐ |
| 5.2 | Login tenant → redireciona para `/dashboard` | ☐ |
| 5.3 | Dashboard carrega KPIs e próximos vencimentos | ☐ |
| 5.4 | Listar clientes (paginação anterior/próximo) | ☐ |
| 5.5 | Criar cliente com plano, conexão e tags | ☐ |
| 5.6 | Editar cliente e salvar | ☐ |
| 5.7 | CRUD plano (criar + editar + salvar) | ☐ |
| 5.8 | CRUD servidor com tags | ☐ |
| 5.9 | Busca por nome na listagem filtra e volta para página 1 | ☐ |
| 5.10 | Logout limpa `token` e bloqueia rotas protegidas | ☐ |
| 5.11 | Mobile: listas em cards + footer de paginação utilizável | ☐ |
| 5.12 | Configurações → somente **Mercado Pago** visível; salvar access token MP | ☐ |
| 5.13 | Gerar PIX sem credencial MP → toast com mensagem real da API (não genérico) | ☐ |
| 5.14 | Enviar cobrança WhatsApp sem conectar → toast *"WhatsApp não conectado…"* | ☐ |

---

## 6. Smoke tests manuais (admin plataforma)

| # | Fluxo | OK |
|---|-------|:--:|
| 6.1 | Login `/admin/login` → dashboard admin | ☐ |
| 6.2 | Listar contas | ☐ |
| 6.3 | Criar conta (owner + senha inicial) | ☐ |
| 6.4 | Suspender/reativar conta | ☐ |
| 6.5 | Reset de senha do owner (instruções exibidas) | ☐ |
| 6.6 | Token admin **não** acessa rotas tenant (`/api/customers`, etc.) | ☐ |
| 6.7 | Criar conta com identificador inválido → toast/mensagem de validação legível | ☐ |
| 6.8 | Settings admin → default **Mercado Pago**; outros PSPs indisponíveis | ☐ |

---

## 7. Isolamento multi-tenant (crítico)

| # | Item | OK |
|---|------|:--:|
| 7.1 | Tenant A não vê clientes/planos/servidores do tenant B (testar com 2 contas) | ☐ |
| 7.2 | `tagIds` de outro tenant não vinculam em create/update | ☐ |
| 7.3 | JWT expirado retorna 401 e front redireciona para login | ☐ |

---

## 8. Deploy e pós-release

| # | Item | OK |
|---|------|:--:|
| 8.1 | Processo API reiniciado com nova versão (`node dist/main.js` ou PM2/systemd) | ☐ |
| 8.2 | Front servido (Nginx estático ou CDN) com cache busting | ☐ |
| 8.3 | Health check monitorado (Uptime Kuma, etc.) | ☐ |
| 8.4 | Logs da API acessíveis (erro 500 rastreável) | ☐ |
| 8.5 | Versão/commit anotados (tag git ou changelog interno) | ☐ |
| 8.6 | Plano de rollback: imagem/commit anterior + restore do backup DB | ☐ |

---

## 9. Bloqueadores conhecidos (não obrigatório para MVP interno)

Itens da avaliação técnica que **ainda não** bloqueiam release interna, mas bloqueiam SaaS público:

| Item | Status atual |
|------|----------------|
| Testes automatizados (API + isolamento tenant) | Ausente |
| CI (build + lint + migrate dry-run) | Ausente |
| RBAC por `UserRole` nas rotas | Schema existe; API não enforce |
| `Customer.status` unificado (Prisma / Zod / UI) | Inconsistente |
| Redis/BullMQ | Docker ok; código não usa |
| Listagem admin paginada | Lista todas as contas |

---

## 10. Comandos úteis (referência rápida)

```bash
# Infra local
docker compose up -d

# Migrações (ambiente alvo)
cd apps/api
npx prisma migrate deploy
npx prisma generate

# Dev
npm run api:dev    # porta 3001
npm run web:dev    # porta 5173

# Build release
npm run build
```

| Serviço | Porta padrão (dev) |
|---------|-------------------|
| API | 3001 |
| Web | 5173 |
| Postgres (compose) | 5433 → 5432 |
| Redis (compose) | 6380 → 6379 |

---

## Critério de “pode subir”

**Staging / uso interno:** seções **1–8** completas (exceto itens marcados como P1 opcional).

**Produção pública:** além do acima, tratar bloqueadores da seção **9** (pelo menos testes de tenant isolation + CI + JWT/CORS hardened).

---

*Última revisão: 12/06/2026 — inclui smoke Mercado Pago único e erros API legíveis (feature 13).*
