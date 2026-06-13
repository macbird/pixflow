# Feature 14 — Painel admin (overhaul)

**Status:** ✅ Concluída (revisão 13/06/2026)  
**Prioridade:** Alta  
**Última revisão:** 13/06/2026  

Relacionado: [02-phase-2-admin-panel.md](./02-phase-2-admin-panel.md) · [10-billing-dual-layer.md](./10-billing-dual-layer.md) · [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)

---

## Objetivo

Consolidar e corrigir o **painel admin da plataforma** (`/admin/*`) para operação diária: UX consistente, erros legíveis (aproveitando Feature 13), fluxos de conta/fatura SaaS completos e débitos técnicos da Fase 2.

---

## Problemas atuais

| Área | Sintoma |
|------|---------|
| UX / layout | `FormLayout` legado ainda referenciado; inconsistência com `PageLayout` do tenant |
| Contas | Edição limitada (status/vencimento); falta telefone de notificação visível |
| Faturas SaaS | Canceladas podem “sumir” em páginas seguintes da listagem |
| Configurações admin | PSP travado em MP (Feature 13), mas copy e webhook MP plataforma podem estar incompletos |
| Erros | Toasts genéricos em `AccountsPage`, modais, login admin |
| Operação | Sem visão rápida de tenants com WhatsApp/PSP mal configurados |

---

## Escopo

### Dentro

- Migrar telas admin restantes para padrão `PageLayout` + componentes compartilhados.
- Adotar `getApiErrorMessage` em **todas** as mutations admin.
- Listagem de contas: filtros por status, indicador de config incompleta (MP sem token, slug ausente).
- Faturas SaaS admin: filtro por status; fatura cancelada permanece encontrável.
- Formulário de conta: campo **telefone da conta** (notificação automação / resumo).
- Dashboard admin: cards de saúde (tenants ativos, inadimplência, últimos pagamentos).
- Documentar smoke admin no `RELEASE_CHECKLIST.md`.

### Fora

- Impersonation tenant (backlog).
- Novos PSPs.
- Relatórios avançados (Feature 17).

---

## Entregas sugeridas

| PR | Conteúdo |
|----|----------|
| PR1 | Toasts/erros admin + tipos API |
| PR2 | Contas: telefone, badges de saúde, busca/filtros |
| PR3 | Faturas/pagamentos SaaS: filtros e UX listagem |
| PR4 | Dashboard admin + polish visual |

**Estimativa:** ~4 dias.

---

## Critérios de aceite

- [x] Criar/editar conta com identificador inválido → mensagem clara no toast/campo (Zod + `getApiErrorMessage`).
- [x] Listagem de faturas SaaS filtra por `canceled` (modal de filtros + link no dashboard).
- [x] Admin settings salva credencial MP com mensagem de erro real se token inválido.
- [x] Dashboard exibe KPIs + cards de saúde operacional sem regressão.
