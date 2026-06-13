# Coding conventions — Client Manager

**Status:** Ativo  
**Última revisão:** 13/06/2026

Relacionado: [00-architecture-modular.md](./00-architecture-modular.md) · [05-cursor-workflow.md](./05-cursor-workflow.md)

---

## Headers e copyright

Este projeto **não usa** blocos de copyright corporativo (NTT DATA ou similares).

| Não usar | Motivo |
|----------|--------|
| `Copyright (c) …` | Projeto open/internal sem política de header corporativo |
| `@author`, `@since`, `@creationDate` em blocos de classe | Metadados de release EVA não se aplicam aqui |
| Headers multi-linha obrigatórios em todo arquivo novo | Ruído; o histórico git já rastreia autoria e data |

### O que usar em vez disso

- **Comentários e JSDoc em inglês** quando o trecho não for óbvio (regra de negócio, contrato público).
- **JSDoc breve** em métodos **públicos** de services/API quando o comportamento precisar de contexto.
- **Sem Javadoc** em métodos privados/protegidos, helpers triviais e componentes React de UI.

Exemplo aceitável:

```typescript
/** Lists tenant-scoped audit events with optional text filter. */
async list(tenantId: string, page: number, pageSize: number, filter = '') { ... }
```

Exemplo a evitar:

```typescript
/**
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 13/06/2026
 * Copyright (c) 2026 …
 */
```

---

## Testes

- Framework: **Vitest** (API e `packages/shared`).
- Mensagens de assertion e `@DisplayName` (quando usado): **inglês**.
- Foco em **comportamento observável**, não em verificação excessiva de mock.
- Novos módulos de domínio devem incluir testes para métodos **públicos** críticos.

---

## TypeScript / API

- Validação de entrada: **Zod** em `packages/shared`, reutilizada na API e no web.
- Erros de negócio: `ApiBusinessError` + `getApiErrorMessage` no front.
- Listagens paginadas: `page >= 1`, `pageSize` entre 1 e 100 (padrão do projeto).

---

## Commits

- Preferir commits **temáticos** (ex.: audit, admin plans, docs) em vez de um único diff monolítico.
- Screenshots de debug **não** versionados na raiz do repositório.
