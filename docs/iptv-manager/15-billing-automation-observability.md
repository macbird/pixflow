# Feature 15 — Automação de cobrança: observabilidade e scheduler

**Status:** 🚫 Fora de escopo (decisão produto 13/06/2026)  
**Prioridade:** —  
**Última revisão:** 13/06/2026  

Relacionado: [12-billing-automation-scheduler.md](./12-billing-automation-scheduler.md)

---

## Decisão de produto

Não haverá card de observabilidade na UI do tenant (último run, preview, erros na tela). O scheduler continua registrando execuções em `billing_job_runs` para suporte/logs; APIs de last-run/preview permanecem no backend se necessário para diagnóstico, mas **não são requisito de produto**.

Também fora de escopo neste épico:

- BullMQ / fila Redis (permanece `node-cron` in-process)
- Último run global visível no admin
- Aviso dev vs prod na UI do scheduler

---

## Referência técnica (implementado no backend)

| Item | Status |
|------|--------|
| `automationRunMinute` no scheduler | ✅ tenant + plataforma |
| `billing_job_runs` persistido | ✅ |
| APIs tenant `last-run` / `preview` / `scheduler-meta` | ✅ (sem UI obrigatória) |

---

## Critérios de aceite

_N/A — feature encerrada como fora de escopo._
