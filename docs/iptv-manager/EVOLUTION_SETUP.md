# Evolution API — setup local (Docker + banco)

Um servidor Evolution atende **vários tenants** (uma instância por `account.slug`).

## 1. Subir infra

Na raiz do monorepo:

```bash
docker compose up -d postgres redis evolution-api
```

- Evolution: http://localhost:8080  
- API key padrão (compose): `evolution-local-dev-key`  
- Postgres app: `localhost:5433` / DB `client_manager`  
- Postgres Evolution: DB `evolution` (criado no primeiro `up` do Postgres com volume novo)

Se o volume Postgres **já existia**, crie o DB manualmente:

```sql
CREATE DATABASE evolution;
```

## 2. Variáveis da API

Em `apps/api/.env` (copie de `.env.example`):

```env
EVOLUTION_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=evolution-local-dev-key
```

`EVOLUTION_API_KEY` deve ser **igual** ao `AUTHENTICATION_API_KEY` do container (ou ao valor em `docker-compose.yml`).

## 3. Provisionar instâncias + gravar no banco

```bash
npm run setup:evolution -w apps/api
```

Por tenant:

```bash
npm run setup:evolution -w apps/api -- --slug=SEU-SLUG --phone=35999516263
```

O script:

1. `POST /instance/create` na Evolution (nome = `slug` da conta)  
2. `upsert` em `tenant_whatsapp_config` (`instance_url`, `api_key` criptografada)  
3. Opcional: atualiza `accounts.phone` com `--phone`  
4. Mostra estado / QR (`GET /instance/connect/{slug}`)

## 4. Conectar WhatsApp (QR)

- Painel Evolution: http://localhost:8080/manager  
- **Manager sem QR / erro `DialogTitle` no console:** abra no navegador  
  `docker/evolution-qr-connect.html` → **Gerar QR e conectar** (usa Socket.IO da Evolution).  
- Se a API retorna `qrcode: { count: 0 }`, recrie o container com as env do `docker-compose` (`CONFIG_SESSION_PHONE_VERSION`, `WEBSOCKET_*`) e recrie a instância.  

Cada revendedor escaneia o QR da **instância com o slug dele**.

## 5. Testar envio

Com Evolution **conectada** e `accounts.phone` preenchido, confirme um pagamento (webhook ou manual) — `PaymentReceivedNotificationService` usa `tenant_whatsapp_config` + Evolution `sendText`.

## Formato no banco

| Campo | Exemplo |
|-------|---------|
| `tenant_whatsapp_config.instance_url` | `http://localhost:8080/toro-tv` |
| `tenant_whatsapp_config.api_key` | API key global (criptografada) |
| `accounts.phone` | `35999516263` (E.164 sem +) |

A API interpreta `instance_url` como **base** `http://localhost:8080` + instância `toro-tv`.

## Produção

- `EVOLUTION_BASE_URL` = URL HTTPS pública da Evolution  
- Mesmo processo: um host, N instâncias  
- Não use `PAYMENT_NOTIFY_PHONE` em produção  

Relacionado: [03-integrations-pix-whatsapp.md](./03-integrations-pix-whatsapp.md)
