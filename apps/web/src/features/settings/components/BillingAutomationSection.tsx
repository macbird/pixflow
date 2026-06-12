import React from 'react';
import type { BillingAutomationSettingsDto } from '@client-manager/shared';
import { DEFAULT_OVERDUE_REMINDERS_SETTINGS } from '@client-manager/shared';

interface BillingAutomationSectionProps {
  value: BillingAutomationSettingsDto;
  onChange: (value: BillingAutomationSettingsDto) => void;
}

function parseWindowDaysInput(raw: string): number[] {
  return raw
    .split(/[,;\s]+/)
    .map((part) => Number(part.trim()))
    .filter((day) => Number.isInteger(day) && day >= 1);
}

export const BillingAutomationSection: React.FC<BillingAutomationSectionProps> = ({
  value,
  onChange,
}) => {
  const overdue = value.overdueReminders ?? DEFAULT_OVERDUE_REMINDERS_SETTINGS;
  const windowsInput = overdue.daysAfterDue.join(', ');

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Automação de cobrança</h3>
        <p className="mt-1 text-xs text-slate-600">
          Gera faturas de assinatura e envia WhatsApp para clientes com vencimento IPTV na janela D-N.
          O job do servidor roda uma vez por hora (início de cada hora cheia) e processa tenants cujo
          horário configurado coincide com a hora atual em America/Sao_Paulo.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.active}
          onChange={(e) => onChange({ ...value, active: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
        />
        Automação ativa
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Dias antes do vencimento (D-N)</label>
          <input
            type="number"
            min={0}
            max={30}
            value={value.daysBeforeDue}
            onChange={(e) => onChange({ ...value, daysBeforeDue: Number(e.target.value || 0) })}
            className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Horário diário (hora cheia)</label>
          <select
            value={value.automationRunHour}
            onChange={(e) =>
              onChange({
                ...value,
                automationRunHour: Number(e.target.value),
                automationRunMinute: 0,
              })
            }
            className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm"
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={hour}>
                {String(hour).padStart(2, '0')}:00
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Padrão: 09:00. Fuso America/Sao_Paulo. O cron verifica a cada hora (ex.: 09:00, 10:00) —
            escolha apenas horas cheias.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={value.sendPaymentCharge}
            onChange={(e) => onChange({ ...value, sendPaymentCharge: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          Gerar PIX antes do envio
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={value.sendWhatsapp}
            onChange={(e) => onChange({ ...value, sendWhatsapp: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          Enviar cobrança via WhatsApp
        </label>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Pós-vencimento (D+N)</h4>
          <p className="mt-1 text-xs text-slate-600">
            Reenvia lembrete WhatsApp usando o PIX já gerado — sem criar fatura nem regenerar PIX.
            Cada janela envia no máximo uma mensagem bem-sucedida por fatura.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={overdue.enabled}
            onChange={(e) =>
              onChange({
                ...value,
                overdueReminders: { ...overdue, enabled: e.target.checked },
              })
            }
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          Lembretes pós-vencimento ativos
        </label>

        {overdue.enabled ? (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Dias após vencimento (janelas)
              </label>
              <input
                type="text"
                value={windowsInput}
                onChange={(e) => {
                  const daysAfterDue = parseWindowDaysInput(e.target.value);
                  onChange({
                    ...value,
                    overdueReminders: {
                      ...overdue,
                      daysAfterDue:
                        daysAfterDue.length > 0
                          ? daysAfterDue
                          : [...DEFAULT_OVERDUE_REMINDERS_SETTINGS.daysAfterDue],
                    },
                  });
                }}
                placeholder="1, 7, 15"
                className="mt-1 block w-full max-w-md rounded-md border border-slate-300 p-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                Padrão: 1, 7, 15. Valores inteiros ≥ 1, sem duplicatas. Máximo 5 janelas.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Dias de grace após falha
              </label>
              <input
                type="number"
                min={0}
                max={7}
                value={overdue.failureGraceDays}
                onChange={(e) =>
                  onChange({
                    ...value,
                    overdueReminders: {
                      ...overdue,
                      failureGraceDays: Number(e.target.value || 0),
                    },
                  })
                }
                className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 p-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                Após o dia ideal da janela, ainda tenta reenviar por mais N dias se nunca houve sucesso.
              </p>
            </div>
          </>
        ) : null}

        <p className="text-xs text-slate-500">
          Após os lembretes configurados, bloqueie o cliente para interromper qualquer cobrança automática.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.autoCloseSubscriptionInvoices}
          onChange={(e) =>
            onChange({ ...value, autoCloseSubscriptionInvoices: e.target.checked })
          }
          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
        />
        Cancelar faturas de assinatura não pagas após o prazo (somente assinatura)
      </label>

      {value.autoCloseSubscriptionInvoices ? (
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Dias após o vencimento para cancelar assinatura
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={value.closeSubscriptionInvoiceAfterDays}
            onChange={(e) =>
              onChange({
                ...value,
                closeSubscriptionInvoiceAfterDays: Number(e.target.value || 30),
              })
            }
            className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 p-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            Faturas avulsas nunca são canceladas automaticamente. Padrão: desligado.
          </p>
        </div>
      ) : null}
    </div>
  );
};
