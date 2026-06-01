# Cliente Manager — Guia de desenvolvimento (Cursor)

Documentação para implementar o sistema com **Cursor**, em **fases**, com **front e back modulares** (sem monolitos).

| Documento | Conteúdo |
|-----------|----------|
| [00-architecture-modular.md](./00-architecture-modular.md) | Monorepo, módulos, limites de dependência |
| [01-phase-1-tenant-app.md](./01-phase-1-tenant-app.md) | Fase 1 — app revendedor; passos 4+ = Fase 3 (billing tenant) |
| [02-phase-2-admin-panel.md](./02-phase-2-admin-panel.md) | Fase 2 — painel admin (✅) + rotas/telas previstas 2.5 |
| [03-integrations-pix-whatsapp.md](./03-integrations-pix-whatsapp.md) | PIX, WhatsApp, adapters |
| [04-open-questions.md](./04-open-questions.md) | Decisões de produto (fechadas) |
| [09-improvements-p0-p1.md](./09-improvements-p0-p1.md) | **Melhorias P0 + P1 (checklist)** |
| [10-billing-dual-layer.md](./10-billing-dual-layer.md) | **Cobrança dupla: plataforma → tenant e tenant → cliente** |
| [05-cursor-workflow.md](./05-cursor-workflow.md) | Como usar o Cursor neste projeto |
| [06-pwa-responsive.md](./06-pwa-responsive.md) | **PWA + layout responsivo (obrigatório)** |
| [07-mobile-cards-ux.md](./07-mobile-cards-ux.md) | **Listas em cards (não tabelas)** |
| [08-mobile-desktop-experience.md](./08-mobile-desktop-experience.md) | **UX celular + navegador desktop** |
| [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | **Progresso real da implementação** |
| [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) | **Checklist de release (staging/prod)** |
| [../CLIENTE-MANAGER-SPEC-TEMP.md](../../CLIENTE-MANAGER-SPEC-TEMP.md) | Especificação funcional completa |

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + Vite + TypeScript + **PWA** (`vite-plugin-pwa`) + **responsivo** (mobile-first) |
| Backend | Node + **Fastify** (plugins por domínio) ou NestJS (módulos) |
| DB | PostgreSQL + Prisma |
| Fila | Redis + BullMQ |
| Deploy inicial | 1 VPS + Docker Compose (custo baixo); webhook dev: `https://api.localhost/...` (placeholder) |

---

## Regra de ouro: modular, não monolito

- **Backend:** um **módulo por domínio** (`auth`, `customers`, `billing`, …). Cada módulo expõe `routes` + `service` + repositório. `app.ts` só registra plugins.
- **Frontend:** um **feature folder** por área (`customers`, `renewals`, …). `shared/` só para UI genérica, hooks, API client.
- **Compartilhado:** `packages/shared` — tipos Zod, constantes, enums (sem lógica de negócio pesada).

Detalhes: [00-architecture-modular.md](./00-architecture-modular.md).

---

## PIX e WhatsApp “próprios”?

| Pergunta | Resposta curta |
|----------|----------------|
| **Criar meu próprio PIX?** | Não como “banco/PSP”. Você cria seu **módulo de pagamento** (adapter) e integra **Asaas, Efi ou Mercado Pago**. Ver [03-integrations-pix-whatsapp.md](./03-integrations-pix-whatsapp.md). |
| **Criar meu próprio WhatsApp?** | Não do zero (protocolo Meta). Você cria **WhatsAppProvider** e integra **Evolution API** (não oficial) ou **WhatsApp Business API** (oficial). |

O que é “seu”: **regras, fluxos, filas, templates** — não a infraestrutura regulada.

---

## Ordem de leitura para o Cursor

1. Este README  
2. `00-architecture-modular.md`  
3. `01-phase-1-tenant-app.md` — implementar **na ordem** dos passos  
4. `09-improvements-p0-p1.md` — melhorias P0/P1 nos passos correspondentes  
5. `10-billing-dual-layer.md` — antes de implementar faturas/PIX (Fase 2.5 e 3)  
6. Spec: `CLIENTE-MANAGER-SPEC-TEMP.md` quando precisar de regra de negócio  

Ao abrir o Cursor no repositório `client-manager`, copie esta pasta `docs/client-manager` e o arquivo `.cursor/rules/client-manager.mdc` (ver [05-cursor-workflow.md](./05-cursor-workflow.md)).

---

## Onde criar o repositório

Recomendado: pasta nova fora do EVA, ex. `C:\Users\jpaulosi\projetos\client-manager\`.

Não misturar com `eva-adapter-security-checker` em produção — este workspace só hospeda a documentação até você criar o repo.
