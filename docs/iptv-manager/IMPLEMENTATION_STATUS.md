# Status da Implementação — IPTV Manager

Este documento registra o progresso real da implementação do projeto, correlacionando com as fases definidas no roadmap.

---

## ✅ Fase 1 — Passo 1: Scaffold e Core
**Status:** Concluído em 27/05/2026

### Entregas Técnicas:
- **Monorepo:** Configurado com NPM Workspaces (`apps/api`, `apps/web`, `packages/shared`).
- **Infra:** `docker-compose.yml` configurado com PostgreSQL 16 (porta 5433) e Redis 7 (porta 6380).
- **Backend (API):**
    - Framework Fastify com TypeScript.
    - ORM Prisma configurado e migrado.
    - Autenticação JWT com decorator `authenticate`.
    - Middleware `tenant-context` para isolamento multi-tenant automático.
- **Frontend (Web):**
    - React 19 + Vite + Tailwind CSS.
    - Configuração PWA (`vite-plugin-pwa`) instalável.
    - Integração com `TanStack Query` e `Axios`.
- **Shared:**
    - Enums globais (Status, Roles, Billing) e Schemas Zod para validação.
- **Módulo Auth:** Fluxo completo de Registro de Conta (Account + AccountUser) e Login.

---

## ✅ Fase 1 — Passo 2: Catálogo do Tenant (Planos, Servidores e Tags)
**Status:** Concluído em 27/05/2026

### Entregas Técnicas:
- **Banco de Dados:** Atualização do schema Prisma com models `Plan`, `Server` e `Tag`.
- **Backend:**
    - Implementação de CRUDs para Planos, Servidores e Tags com validação Zod.
    - Garantia de isolamento por `tenant_id` em todas as operações.
- **Frontend:**
    - **Layout:** `AppShell` com sidebar desktop e menu drawer mobile responsivo.
    - **UI:** Implementação de `CardList` e `EntityCard` (mobile-first).
    - **Features:** Páginas de gerenciamento com formulários em Modais para Planos, Servidores e Tags.
    - **Integração:** Hooks de busca e mutação configurados para os novos módulos.

---

## 🚀 Próximo Passo
- **Passo 3 — Clientes finais e conexões:** CRUD completo de clientes vinculado a planos e servidores, com histórico de conexões.
