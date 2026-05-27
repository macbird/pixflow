# PWA + layout responsivo (obrigatório)

O app do revendedor (`apps/web`) e o painel admin (`apps/admin`, Fase 2) devem ser:

1. **Responsivos** — mobile-first, usáveis em celular, tablet e desktop.  
2. **PWA** — instaláveis na tela inicial; experiência próxima de app nativo.  
3. **Listas em cards** — **não usar tabelas** como lista principal; ver [07-mobile-cards-ux.md](./07-mobile-cards-ux.md).

---

## Stack frontend

| Item | Escolha |
|------|---------|
| Build | Vite |
| PWA | **`vite-plugin-pwa`** (Workbox sob o capô) |
| UI | Tailwind + shadcn/ui (já responsivo por padrão) |
| Ícones PWA | `public/icons/` — 192×192 e 512×512 (+ maskable opcional) |

---

## Estrutura no `apps/web`

```
apps/web/
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── icon-maskable-512.png   # opcional Android
│   └── favicon.ico
├── index.html
├── vite.config.ts                  # VitePWA plugin
└── src/
    ├── app/
    │   ├── layouts/
    │   │   ├── AppShell.tsx        # sidebar desktop + drawer mobile
    │   │   └── AuthLayout.tsx      # login/register centralizado
    │   └── pwa/
    │       ├── usePwaInstall.ts    # prompt "Instalar app"
    │       └── ReloadPrompt.tsx    # opcional: nova versão disponível
    └── main.tsx
```

Fase 2: repetir o mesmo padrão em `apps/admin` (manifest e nome diferentes).

---

## Configuração Vite PWA (referência)

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'IPTV Manager',
        short_name: 'IPTV Manager',
        description: 'Gestão de clientes e cobrança IPTV',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
```

### O que cachear (e o que não)

| Recurso | Estratégia |
|---------|------------|
| JS/CSS/HTML (shell) | Precache (build) |
| API REST (`/api/*`) | **NetworkFirst** — dados sempre frescos quando online |
| Webhook / PIX | Nunca no SW — só servidor |
| Login/register | Sempre rede; não cachear tokens |

**Offline:** mostrar shell + mensagem “Sem conexão”; fila de ações offline é **backlog** (não Fase 1).

---

## Layout responsivo

### Breakpoints (Tailwind padrão)

| Prefixo | Largura | Uso |
|---------|---------|-----|
| default | &lt; 640px | Celular — layout principal |
| `sm` | 640px+ | Celular grande |
| `md` | 768px+ | Tablet — sidebar colapsável |
| `lg` | 1024px+ | Desktop — sidebar fixa |

### AppShell (padrão obrigatório)

| Viewport | Navegação | Listas / dados |
|----------|-----------|----------------|
| **Mobile** | Bottom nav **ou** drawer | **Cards** (`CardList`) — ver [07](./07-mobile-cards-ux.md) |
| **Tablet** | Drawer / sidebar | Cards em 1–2 colunas |
| **Desktop** | Sidebar fixa | Cards em grade 2–3 colunas (Fase 1 **sem** tabela obrigatória) |

### Telas críticas

Detalhes de cada card: **[07-mobile-cards-ux.md](./07-mobile-cards-ux.md)**.

| Tela | Padrão |
|------|--------|
| Todas as listas | `EntityCard` + FAB + `FilterSheet` |
| Dashboard | KPI cards, não tabelas |
| Formulários | 1 coluna, botão salvar sticky |

### Acessibilidade mínima

- Áreas de toque ≥ 44×44 px  
- Contraste WCAG AA em textos principais  
- `viewport` em `index.html`: `width=device-width, initial-scale=1`

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#0f172a" />
```

---

## HTTPS e instalação PWA

PWA **exige HTTPS** em produção (localhost ok em dev).

| Ambiente | Instalável? |
|----------|-------------|
| `https://app.seudominio.com.br` | Sim |
| `http://IP` | Não (exceto localhost) |

Checklist deploy:

- [ ] Certificado SSL (Let’s Encrypt / Cloudflare)  
- [ ] `display: standalone` no manifest  
- [ ] Ícones 192 e 512 publicados  
- [ ] Testar “Adicionar à tela inicial” no Android Chrome e iOS Safari  

**iOS:** Safari → Compartilhar → “Adicionar à Tela de Início”. Não há prompt automático como no Chrome; opcional banner custom (`usePwaInstall` só no Android/Desktop Chrome).

---

## Critérios de aceite (Fase 1)

- [ ] Lighthouse PWA: **installable** (categoria PWA)  
- [ ] Lighthouse mobile performance &gt; 80 (meta; otimizar se menor)  
- [ ] Todas as rotas autenticadas usáveis em 375px de largura (iPhone SE)  
- [ ] Listas 100% em **cards** (sem `<table>` principal) — [07](./07-mobile-cards-ux.md)  
- [ ] Login, lista clientes, renovações e dashboard sem scroll horizontal quebrado  
- [ ] `vite-plugin-pwa` registrado; atualização de versão com `autoUpdate` ou prompt  
- [ ] API não quebra offline (mensagem clara, sem tela branca)  

---

## Componentes de lista (obrigatório Fase 1)

Implementar em `apps/web/src/shared/ui/lists/` — especificação completa em [07-mobile-cards-ux.md](./07-mobile-cards-ux.md):

`CardList`, `EntityCard`, `ListToolbar`, `FilterSheet`, `EmptyState`, `CardListSkeleton`.

---

## Fase 2 — Admin PWA

Mesmas regras em `apps/admin`:

- Manifest: `name: 'IPTV Manager Admin'`, `start_url: '/admin'`  
- Pode ser instalado separadamente do app revendedor  

---

## Prompt Cursor (copiar)

> PWA vite-plugin-pwa + AppShell. Listas SOMENTE cards (07-mobile-cards-ux.md): CardList/EntityCard em shared/ui/lists — proibido table como lista principal. FAB + FilterSheet. API NetworkFirst no SW.
