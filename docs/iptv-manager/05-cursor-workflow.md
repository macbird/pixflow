# Como desenvolver com Cursor

## 1. Criar o repositório

```powershell
mkdir C:\Users\jpaulosi\projetos\iptv-manager
cd C:\Users\jpaulosi\projetos\iptv-manager
git init
```

Copie para o novo repo:

- `docs/iptv-manager/` (esta pasta)
- `IPTV-MANAGER-SPEC-TEMP.md` → renomeie para `docs/SPEC.md`

---

## 2. Regra do Cursor (`.cursor/rules/iptv-manager.mdc`)

Crie o arquivo abaixo no projeto `iptv-manager`:

```markdown
---
description: IPTV Manager - modular monorepo rules
globs: **/*.{ts,tsx,js,jsx}
alwaysApply: true
---

# IPTV Manager

- Monorepo: apps/api (Fastify modules), apps/web (feature folders), packages/shared.
- NEVER create monolithic files (api.ts > 300 lines, single service for all domains).
- Every DB query on tenant data MUST filter by tenantId from JWT, never from body alone.
- New backend code: one module per domain under apps/api/src/modules/.
- New frontend code: one feature under apps/web/src/features/.
- Business rules: read docs/SPEC.md and docs/iptv-manager/01-phase-1-tenant-app.md.
- PIX: use PaymentProvider adapter only; no direct PSP calls outside integrations/payment.
- WhatsApp: use WhatsAppProvider adapter only.
- Language: user-facing app strings PT-BR; code, commits, javadoc/comments EN.
- Do not implement Phase 2 admin routes until Phase 1 checklist is done.
- Frontend MUST be responsive (mobile-first) and PWA via vite-plugin-pwa; follow docs/iptv-manager/06-pwa-responsive.md.
- Use AppShell: desktop sidebar, mobile drawer/bottom nav; tables become cards on small screens.
- Service worker: precache assets; API routes NetworkFirst — never cache auth tokens.
- Lists: CardList + EntityCard only; NO HTML table as primary list UI (docs/iptv-manager/07-mobile-cards-ux.md).
- Mobile: FAB for create, FilterSheet for filters, infinite scroll or LoadMore on lists.
- Apply P0/P1 improvements from docs/iptv-manager/09-improvements-p0-p1.md in the matching phase step.
```

---

## 3. Fluxo de trabalho por sessão Cursor

1. Abra o passo atual (`01-phase-1-tenant-app.md` → Passo N).  
2. Chat Cursor (Agent):  

   > Implemente apenas o Passo N do docs/iptv-manager/01-phase-1-tenant-app.md.  
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

Este projeto **não** é módulo `eva-*`. Desative regras do monorepo EVA ao abrir só `iptv-manager` no Cursor (workspace na pasta correta).

---

## 7. Commits sugeridos

Um commit por passo ou sub-passo:

```
feat(api): add auth module with tenant register
feat(web): customers list and detail pages
feat(billing): asaas pix webhook and payment confirmation
```
