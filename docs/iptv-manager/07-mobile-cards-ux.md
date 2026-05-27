# Listas mobile-first — Cards (não tabelas)

**Regra de produto:** toda listagem do app é pensada **primeiro para celular**. A representação padrão é **cards**, não tabelas HTML.

Referência cruzada: [06-pwa-responsive.md](./06-pwa-responsive.md) (PWA + AppShell).

---

## Princípio

| ❌ Evitar | ✅ Usar |
|----------|--------|
| `<table>` como lista principal | **Card** por item (`EntityCard`) |
| Scroll horizontal em listas | Scroll **vertical** apenas |
| Muitas colunas visíveis no mobile | 2–4 **campos destaque** no card + “ver mais” |
| Clique em linha fina | Card inteiro clicável (min-height confortável) |
| Filtros só em sidebar desktop | **Bottom sheet** ou chip row para filtros |
| Paginação clássica só | **Infinite scroll** ou “Carregar mais” no mobile |

**Desktop (lg+):** manter **cards** em grade (1–2–3 colunas) **ou** oferecer toggle “visualização compacta” (tabela densa) — **opcional Fase 2**. Fase 1 = **só cards em todos os breakpoints**.

---

## Componentes compartilhados (`apps/web/src/shared/ui/lists/`)

Criar no **Passo 1** e reutilizar em todas as features.

| Componente | Responsabilidade |
|------------|------------------|
| `CardList` | Container: loading skeleton, empty, error, lista de cards |
| `EntityCard` | Base: padding, sombra, `onClick`, slots header/body/footer |
| `ListToolbar` | Busca sticky + botão filtros + FAB opcional |
| `FilterSheet` | Bottom sheet (shadcn Sheet) com filtros |
| `StatusBadge` | Ativo, inadimplente, pendente renovação, etc. |
| `CardListSkeleton` | 5–8 placeholders animados |
| `EmptyState` | Ícone + texto + CTA (“Cadastrar cliente”) |
| `LoadMoreButton` | Paginação mobile-friendly |

**Proibido** em features: copiar markup de card em 10 arquivos — estender `EntityCard`.

### API sugerida `CardList`

```tsx
type CardListProps<T> = {
  items: T[];
  keyExtractor: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyTitle?: string;
  emptyAction?: React.ReactNode;
};
```

---

## Anatomia de um card (cliente final — exemplo)

```
┌─────────────────────────────────────┐
│ João Silva              [Ativo]   │  ← título + StatusBadge
│ (11) 99999-9999                     │  ← telefone (link wa opcional)
│ Plano Família · 2 conexões          │  ← subtítulo
│ Vence dia 10 · R$ 49,90             │  ← meta cobrança
│ [VIP]                               │  ← tags chips
└─────────────────────────────────────┘
        tap → /customers/:id
```

**Ações rápidas (opcional no card):** ícone WhatsApp, copiar telefone — área separada para não conflitar com navegação.

---

## Por tela (Fase 1)

| Tela | Card mostra | Ações no card / detalhe |
|------|-------------|-------------------------|
| **Clientes** | Nome, telefone, plano, conexões, status, vencimento | Tap → detalhe; FAB + novo |
| **Conexões** (dentro do cliente) | MAC, app, servidor, status | Accordion ou sub-cards |
| **Planos** | Nome, preço, max conexões | Tap → editar |
| **Servidores** | Nome, URL truncada, qtd conexões | Botão “Abrir painel” |
| **Faturas** | Cliente, valor, vencimento, status PIX | Tap → detalhe / copiar PIX |
| **Pagamentos** | Cliente, valor, data, método | Tap → detalhe |
| **Renovações** | Cliente, pago em, servidor, MAC | Botão grande **Renovado** no card |
| **Logs** | Data, usuário, ação, resumo | Tap → expandir detalhe (accordion) |
| **Mensagens (log)** | Cliente, template, status envio | Cores por status |

**Dashboard:** só **cards de métrica** (KPI), nunca tabela de resumo no mobile.

---

## Técnicas mobile adicionais

| Técnica | Uso |
|---------|-----|
| **Sticky header** | Busca + filtros fixos no topo ao rolar |
| **FAB** | “+ Novo cliente” canto inferior direito |
| **Bottom sheet** | Filtros avançados (status, plano, tag) |
| **Chips** | Filtros ativos removíveis abaixo da busca |
| **Skeleton** | Carregamento perceived performance |
| **Pull-to-refresh** | Opcional nas listas principais |
| **Infinite scroll** | `useInfiniteQuery` (TanStack Query) |
| **Swipe actions** | Opcional Fase 2 (ex.: arquivar) — não obrigatório |
| **safe-area-inset** | Padding para notch e home indicator iOS |

---

## Formulários no celular

- 1 coluna; labels acima do campo  
- `inputMode="tel"` em telefone; `inputMode="numeric"` em dia vencimento  
- Botão primário **fixo no rodapé** (sticky) em formulários longos  
- Conexões: lista de **sub-cards** + “Adicionar conexão”  

---

## O que NÃO fazer (review / Cursor)

```tsx
// ❌ PROIBIDO como padrão de lista
<table className="min-w-[800px]">...</table>

// ❌ PROIBIDO — tabela só em md sem alternativa card
<div className="hidden md:block"><Table /></div>
<div className="md:hidden">...</div>  // só ok se mobile tem cards completos
```

```tsx
// ✅ PADRÃO
<CardList
  items={customers}
  renderCard={(c) => <CustomerCard customer={c} />}
  ...
/>
```

---

## Critérios de aceite (listas)

- [ ] Nenhuma rota de lista usa `<table>` como UI principal na Fase 1  
- [ ] Clientes, faturas, renovações, pagamentos usam `CardList` + `EntityCard`  
- [ ] Testado em 375px: sem scroll horizontal na lista  
- [ ] Toque no card abre detalhe; botões secundários ≥ 44px  
- [ ] Filtros acessíveis via sheet no mobile  

---

## Prompt Cursor (copiar)

> Todas as listagens mobile-first com CardList e EntityCard em shared/ui/lists. Proibido table como lista principal. Clientes, invoices, renewals, payments, logs seguem anatomia em docs/iptv-manager/07-mobile-cards-ux.md. FAB para criar, FilterSheet para filtros, infinite scroll com TanStack Query.
