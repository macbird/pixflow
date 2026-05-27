# Fase 2 — Painel admin (plataforma)

Só iniciar após **Fase 1** estável em produção.

Referência: spec §2.2 (login admin separado), §10 Fase 2.

---

## Pré-requisitos

- [ ] Fase 1 em produção com pelo menos 1 tenant real
- [ ] Módulos Fase 1 não importam nada de `admin`
- [ ] Tabela `platform_admin` (separada de `account_user`)

---

## Passo 1 — Backend admin

### Novo módulo (não misturar com tenant)

```
apps/api/src/modules/admin/
├── admin-auth.routes.ts
├── tenants.routes.ts
├── tenants.service.ts
├── admin-dashboard.routes.ts
└── index.ts
```

### Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/admin/auth/login` | Login super_admin |
| GET | `/api/admin/tenants` | Lista accounts |
| PATCH | `/api/admin/tenants/:id` | Suspender / ativar |
| GET | `/api/admin/dashboard` | Métricas globais |
| GET | `/api/admin/audit-logs` | Logs cross-tenant (read-only) |

### Guards

- JWT com `type: 'platform_admin'` (claim diferente do tenant)
- **Proibido** usar mesmo secret/issuer sem distinção de claims

---

## Passo 2 — Frontend admin

Opção A: `apps/admin` (Vite separado)  
Opção B: `apps/web` com prefixo `/admin/*` e lazy load

Recomendado: **`apps/admin`** para bundle isolado.

**PWA + responsivo:** mesmo padrão de [06-pwa-responsive.md](./06-pwa-responsive.md) (manifest próprio, `start_url: /admin`).

### Telas

- [ ] `/admin/login`
- [ ] `/admin` dashboard plataforma
- [ ] `/admin/tenants`
- [ ] `/admin/tenants/:id`
- [ ] `/admin/logs` (opcional)

---

## Passo 3 — Operações de suporte (opcional)

- [ ] Impersonation: super_admin gera JWT temporário de tenant (audit obrigatório)
- [ ] Plano SaaS: limite de clientes por `account` (quando definir monetização)

---

## Critério de pronto Fase 2

Super admin lista tenants, suspende conta, vê métricas globais sem acessar dados sensíveis desnecessários (LGPD).
