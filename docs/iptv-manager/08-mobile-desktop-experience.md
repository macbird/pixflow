# Experiência mobile + navegador desktop

Um único app (`apps/web`): **mobile-first**, mas **totalmente usável no computador** (Chrome, Edge, Firefox, Safari). Não são dois apps — é **responsive + PWA** com melhorias progressivas.

Relacionado: [06-pwa-responsive.md](./06-pwa-responsive.md), [07-mobile-cards-ux.md](./07-mobile-cards-ux.md).

---

## Princípio: progressive enhancement

| Camada | Mobile (prioridade) | Desktop (enhancement) |
|--------|---------------------|------------------------|
| Listas | Cards verticais | Cards em **grid** 2–3 colunas |
| Navegação | Bottom nav ou drawer | **Sidebar fixa** |
| Ações | FAB, botões grandes | Botão no header + atalhos teclado (opcional) |
| Filtros | Bottom sheet | Sheet **ou** painel lateral `lg:` |
| Teclado | `inputMode`, evitar zoom indesejado | Tab order, `Enter` submit |
| PWA | Instalar, standalone | Instalar no Chrome desktop também |

**Mesmo código**, classes Tailwind `md:` / `lg:` — não fork de UI.

---

## Melhorias no celular (além de cards e PWA)

### 1. Performance percebida

| Técnica | Benefício |
|---------|-----------|
| **Skeleton** em listas | Menos “tela branca” |
| **TanStack Query** `staleTime` + cache | Voltar à lista sem recarregar tudo |
| **Imagens/ícones** SVG ou ícones leves (lucide) | Menos peso que PNG |
| **Code splitting** por rota (`React.lazy`) | 1ª carga menor |
| **Virtualização** (`@tanstack/react-virtual`) | Listas com 500+ clientes sem travar |

### 2. Gestos e toque

| Técnica | Uso no IPTV Manager |
|---------|---------------------|
| **Pull-to-refresh** | Listas clientes, renovações, faturas |
| **Tap target ≥ 44px** | Botões, cards, chips |
| **`touch-action: manipulation`** | Menos delay de 300ms em botões |
| **Swipe actions** (opcional F2) | Deslizar card → WhatsApp / copiar PIX |
| **Evitar hover-only** | Toda ação visível sem mouse |

### 3. Entrada de dados no mobile

| Técnica | Campo |
|---------|-------|
| `type="tel"` + `inputMode="tel"` | Telefone |
| `inputMode="numeric"` | Dia vencimento, valor |
| `autocomplete` | `email`, `name` no register |
| **Máscara** (react-input-mask ou similar) | Telefone BR, opcional CPF |
| **Copiar PIX** | `navigator.clipboard.writeText` + toast “Copiado!” |
| **Abrir WhatsApp** | `https://wa.me/55{digits}?text=...` |

### 4. Feedback claro

| Técnica | Quando |
|---------|--------|
| **Toast** (sonner) | Salvo, erro API, PIX copiado |
| **Estados vazios** ilustrados | Sem clientes, sem renovações pendentes |
| **Offline banner** | `navigator.onLine` + PWA |
| **Confirmação** em ações destrutivas | Excluir cliente, cancelar fatura |
| **Loading no botão** | Evitar double-tap em “Salvar” / “Renovado” |

### 5. PWA além do básico

| Recurso | Uso |
|---------|-----|
| **`display: standalone`** | Sem barra do browser |
| **`theme-color` + `apple-mobile-web-app-capable`** | Status bar iOS |
| **`viewport-fit=cover` + safe-area** | Notch / barra inferior iPhone |
| **Ícone maskable** | Android sem borda feia |
| **Prompt instalar** | Banner discreto após 2º login (Android/Desktop Chrome) |
| **Atualização** | Toast “Nova versão — Atualizar” (`vite-plugin-pwa`) |
| **Shortcuts no manifest** (opcional) | “Novo cliente”, “Renovações pendentes” |

```json
"shortcuts": [
  { "name": "Novo cliente", "url": "/customers/new", "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }] },
  { "name": "Renovações", "url": "/renewals", "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }] }
]
```

### 6. Acessibilidade (mobile e desktop)

- Contraste AA (Tailwind `text-foreground` / shadcn themes)  
- `aria-label` em ícones só com símbolo  
- Foco visível no teclado (desktop)  
- `prefers-reduced-motion` para animações leves  

### 7. Notificações (backlog pós-Fase 1)

| Tipo | Canal |
|------|--------|
| **Web Push** | “Pagamento recebido”, “Renovação pendente” (pede permissão) |
| Relatório diário | E-mail (já previsto) — não substitui push |

Requer VAPID + service worker — complexidade média; **não obrigatório Fase 1**.

---

## Melhorias no navegador (computador)

### Layout `lg:` (≥ 1024px)

| Área | Comportamento desktop |
|------|----------------------|
| **Navegação** | Sidebar 240px fixa, ícones + texto |
| **Listas** | `grid grid-cols-2 xl:grid-cols-3 gap-4` de **cards** (ainda cards!) |
| **Detalhe cliente** | 2 colunas: formulário | conexões lateral |
| **Dashboard** | Grid 4 KPIs + gráficos lado a lado |
| **Modais** | `Dialog` centralizado grande, não full-screen |
| **Tabelas** | Opcional Fase 2: toggle “vista compacta” para export mental — **não default** |

### Produtividade desktop

| Técnica | Exemplo |
|---------|---------|
| **Atalhos** (opcional) | `/` foca busca; `n` novo cliente |
| **Ctrl+S** | Salvar formulário |
| **Links externos** | `panel_url` → `target="_blank" rel="noopener"` |
| **Hover states** | Preview em botões secundários |
| **Largura máxima** | `max-w-7xl mx-auto` — não esticar infinito em ultrawide |

### O que o desktop **não** precisa

- App nativo Windows/macOS (PWA instalável no Chrome já cobre “app”)  
- Versão separada “desktop only”  
- Tabelas obrigatórias — cards em grid bastam para revenda pequena/média  

---

## Safe area e CSS (iOS PWA)

```css
/* globals.css */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
```

AppShell com bottom nav:

```tsx
<nav className="fixed bottom-0 inset-x-0 pb-safe border-t lg:static lg:border-0">
```

---

## Hook útil: `useMediaQuery` / breakpoints

```tsx
// shared/hooks/useBreakpoint.ts
export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}
```

Usar para: mostrar sidebar vs bottom nav — **não** para esconder funcionalidade.

---

## Checklist UX (aceite Fase 1)

### Celular (375px, PWA ou Safari)

- [ ] Listas só cards; FAB; filtros em sheet  
- [ ] Copiar PIX e abrir WhatsApp em 1–2 toques  
- [ ] Formulários sem zoom irritante (`font-size` inputs ≥ 16px no iOS)  
- [ ] Bottom nav não cobre conteúdo (`pb-safe`)  
- [ ] Offline: banner, não crash  

### Desktop (1280px, Chrome/Edge/Firefox)

- [ ] Sidebar + área central legível  
- [ ] Cards em grid; sem “faixa estreita” no meio da tela  
- [ ] Modais e formulários confortáveis com mouse  
- [ ] Todas as ações do mobile existem (paridade de features)  

### Ambos

- [ ] Mesmo login, mesmos dados, mesmo JWT  
- [ ] HTTPS em produção  

---

## Stack sugerida (pacotes)

| Pacote | Uso |
|--------|-----|
| `vite-plugin-pwa` | PWA |
| `@tanstack/react-query` | Cache + infinite scroll |
| `sonner` | Toasts |
| `vaul` ou shadcn `Sheet` | Bottom sheet filtros |
| `lucide-react` | Ícones leves |
| `@tanstack/react-virtual` | Listas longas (quando necessário) |

---

## Prioridade de implementação

| Prioridade | Item | Fase |
|------------|------|------|
| P0 | Cards + AppShell mobile/desktop | 1 |
| P0 | FAB, FilterSheet, toast, clipboard PIX | 1 |
| P0 | Safe area + font 16px inputs iOS | 1 |
| P1 | Pull-to-refresh, skeleton, lazy routes | 1 |
| P1 | Grid cards no `lg:` | 1 |
| P2 | Manifest shortcuts | 1 final |
| P2 | Atalhos teclado | 2 |
| P3 | Web Push | pós-1 |
| P3 | Swipe actions | 2 |

---

## Prompt Cursor (copiar)

> Melhore UX mobile+desktop: mobile-first cards; lg sidebar + grid de cards; bottom nav com safe-area no mobile; sonner toasts; clipboard PIX; wa.me links; input font-size 16px; pull-to-refresh nas listas principais; React.lazy por rota. Paridade total de features mobile/desktop. Ver docs/iptv-manager/08-mobile-desktop-experience.md.
