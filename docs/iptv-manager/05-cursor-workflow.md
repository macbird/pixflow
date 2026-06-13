# Como desenvolver com Cursor

## 1. Criar o repositório

```powershell
mkdir C:\Users\jpaulosi\projetos\client-manager
cd C:\Users\jpaulosi\projetos\client-manager
git init
```

Copie para o novo repo:

- `docs/client-manager/` (esta pasta)
- `CLIENTE-MANAGER-SPEC-TEMP.md` → renomeie para `docs/SPEC.md`

---

## 2. Regra do Cursor (`.cursor/rules/client-manager.mdc`)

Crie o arquivo abaixo no projeto `client-manager`:

```markdown
---
description: Cliente Manager - modular monorepo rules
globs: **/*.{ts,tsx,js,jsx}
alwaysApply: true
---

# Cliente Manager

- Monorepo: apps/api (Fastify modules), apps/web (feature folders), packages/shared.
- NEVER create monolithic files (api.ts > 300 lines, single service for all domains).
- Every DB query on tenant data MUST filter by tenantId from JWT, never from body alone.
- New backend code: one module per domain under apps/api/src/modules/.
- New frontend code: one feature under apps/web/src/features/.
- Business rules: read docs/SPEC.md and docs/client-manager/01-phase-1-tenant-app.md.
- PIX / pagamento: use `PaymentProvider` adapter only (`emv` ou `checkout_link`); no direct PSP calls outside integrations/payment. Ver docs/iptv-manager/03-integrations-pix-whatsapp.md.
- WhatsApp: use WhatsAppProvider adapter only.
- Language: user-facing app strings PT-BR; code, commits, javadoc/comments EN.
- No corporate copyright headers, @author, @since, or @creationDate blocks — see docs/iptv-manager/21-coding-conventions.md.
- Do not implement Phase 2 admin routes until Phase 1 checklist is done.
- Frontend MUST be responsive (mobile-first) and PWA via vite-plugin-pwa; follow docs/client-manager/06-pwa-responsive.md.
- Use AppShell: desktop sidebar, mobile drawer/bottom nav; tables become cards on small screens.
- Service worker: precache assets; API routes NetworkFirst — never cache auth tokens.
- Lists: CardList + EntityCard only; NO HTML table as primary list UI (docs/client-manager/07-mobile-cards-ux.md).
- Mobile: FAB for create, FilterSheet for filters, infinite scroll or LoadMore on lists.
- Apply P0/P1 improvements from docs/client-manager/09-improvements-p0-p1.md in the matching phase step.
```

---

## 3. Fluxo de trabalho por sessão Cursor

1. Abra o passo atual (`01-phase-1-tenant-app.md` → Passo N).  
2. Chat Cursor (Agent):  

   > Implemente apenas o Passo N do docs/client-manager/01-phase-1-tenant-app.md.  
   > Siga 00-architecture-modular.md. Não avance para Passo N+1.

3. Revise diff: pastas `modules/` e `features/` respeitadas.  
4. Rode testes do módulo alterado.  
5. Marque `[x]` no markdown do passo (manual ou peça ao Cursor).

---

## 4. Prompts úteis

| Situação | Prompt |
|----------|--------|
| Novo módulo backend | “Crie módulo Fastify `renewals` com routes, service, Prisma, Zod em packages/shared, sem importar billing diretamente — use evento PaymentConfirmed.” |
| Nova feature front | “Crie feature `renewals` com lista, filtros pending/renewed, mutation marcar renovado, usando shared/api client.” |
| Revisão anti-monolito | “Liste arquivos &gt; 250 linhas e imports entre modules que violam 00-architecture-modular.md.” |
| Webhook PIX | “Implemente webhook idempotente no módulo billing conforme 03-integrations-pix-whatsapp.md.” |

---

## 5. O que não pedir ao Cursor

- “Crie todo o sistema de uma vez” → gera monolito.  
- “PIX sem PSP” → inviável.  
- “WhatsApp sem Evolution/Meta” → inviável.  
- Pular multi-tenant “para depois” → retrabalho total.

---

## 6. Skills / regras EVA

Este projeto **não** é módulo `eva-*`. Desative regras do monorepo EVA ao abrir só `client-manager` no Cursor (workspace na pasta correta).

---

## 8. Política Obrigatória de Testes

**Regra de Ouro:** Nenhuma fase ou nova funcionalidade será considerada concluída sem a devida validação via **Chrome DevTools**.

- É obrigatório testar o fluxo completo (CRUD: Criar, Ler, Editar, Excluir) antes de avançar para a próxima fase do desenvolvimento.
- O uso de modais para formulários é proibido em dispositivos móveis. Todo CRUD deve seguir o padrão de rotas dedicadas (`/entity/new`, `/entity/:id/edit`).
- Apenas avançar para a próxima etapa (ex: Módulo de Clientes) após ter validado que o CRUD do módulo atual (ex: Planos, Servidores, Tags) está 100% funcional, com feedback visual (toasts) e navegação correta.
- Em caso de erros, investigue a rede (Network Tab) e o console antes de prosseguir.

