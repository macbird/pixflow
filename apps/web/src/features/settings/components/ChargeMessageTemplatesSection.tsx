import React from 'react';
import { Pencil, Eye } from 'lucide-react';
import {
  CHARGE_MESSAGE_PLACEHOLDERS,
  DEFAULT_CHARGE_MESSAGE_DELAY_MS,
  buildChargeMessagePreviewContext,
  buildChargeMessagesFromTemplates,
  type ChargeMessageSettingsDto,
  type ChargeMessageTemplateContext,
} from '@client-manager/shared';

interface ChargeMessageTemplatesSectionProps {
  title?: string;
  value: ChargeMessageSettingsDto;
  onChange: (value: ChargeMessageSettingsDto) => void;
  /** When set, preview uses real invoice/customer data instead of sample placeholders. */
  previewContext?: ChargeMessageTemplateContext;
  /** Starts in rendered preview mode; user toggles to edit templates. */
  previewFirst?: boolean;
  onEditModeChange?: (editing: boolean) => void;
}

export const ChargeMessageTemplatesSection: React.FC<ChargeMessageTemplatesSectionProps> = ({
  title = 'Mensagem de cobrança (WhatsApp)',
  value,
  onChange,
  previewContext,
  previewFirst = false,
  onEditModeChange,
}) => {
  const [editMode, setEditMode] = React.useState(!previewFirst || !previewContext);

  React.useEffect(() => {
    onEditModeChange?.(editMode);
  }, [editMode, onEditModeChange]);

  const toggleEditMode = () => setEditMode((current) => !current);

  const templateContext = previewContext ?? buildChargeMessagePreviewContext();

  const previewMessages = React.useMemo(
    () => buildChargeMessagesFromTemplates(value.templates, templateContext),
    [value.templates, templateContext],
  );

  const updateTemplate = (index: number, text: string) => {
    const templates = [...value.templates];
    templates[index] = text;
    onChange({ ...value, templates });
  };

  const addTemplate = () => {
    onChange({ ...value, templates: [...value.templates, ''] });
  };

  const removeTemplate = (index: number) => {
    if (value.templates.length <= 1) return;
    onChange({ ...value, templates: value.templates.filter((_, i) => i !== index) });
  };

  const moveTemplate = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.templates.length) return;
    const templates = [...value.templates];
    [templates[index], templates[target]] = [templates[target], templates[index]];
    onChange({ ...value, templates });
  };

  const insertPlaceholder = (index: number, placeholder: string) => {
    updateTemplate(index, `${value.templates[index] ?? ''}${placeholder}`);
  };

  const showPreviewOnly = previewFirst && previewContext && !editMode;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-600">
            {showPreviewOnly
              ? 'Prévia das mensagens que serão enviadas ao cliente.'
              : 'Configure quantas mensagens quiser na sequência. O PIX em mensagem separada facilita copiar no celular.'}
          </p>
        </div>
        {previewFirst && previewContext ? (
          <button
            type="button"
            onClick={toggleEditMode}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {editMode ? (
              <>
                <Eye className="h-3.5 w-3.5" />
                Ver prévia
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" />
                Editar mensagens
              </>
            )}
          </button>
        ) : null}
      </div>

      {showPreviewOnly ? (
        <div className="rounded-lg border border-emerald-100 bg-[#e5ddd5] p-4">
          <div className="space-y-3">
            {previewMessages.length === 0 ? (
              <p className="text-sm text-slate-600">Nenhuma mensagem configurada.</p>
            ) : (
              previewMessages.map((message, index) => (
                <div key={index} className="flex justify-end">
                  <div className="max-w-[92%] rounded-lg rounded-tr-sm bg-[#dcf8c6] px-3 py-2 shadow-sm">
                    <p className="mb-1 text-[10px] font-medium text-emerald-800/70">
                      Mensagem {index + 1}
                    </p>
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-900">
                      {message}
                    </pre>
                  </div>
                </div>
              ))
            )}
          </div>
          {value.delayMs > 0 && previewMessages.length > 1 ? (
            <p className="mt-3 text-center text-[11px] text-slate-600">
              Intervalo de {(value.delayMs / 1000).toLocaleString('pt-BR')}s entre cada mensagem
            </p>
          ) : null}
        </div>
      ) : null}

      {!showPreviewOnly ? (
      <>
      <div className="space-y-4">
        {value.templates.map((template, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-800">Mensagem {index + 1}</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => moveTemplate(index, -1)}
                  disabled={index === 0}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveTemplate(index, 1)}
                  disabled={index === value.templates.length - 1}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeTemplate(index)}
                  disabled={value.templates.length <= 1}
                  className="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700 disabled:opacity-40"
                >
                  Remover
                </button>
              </div>
            </div>

            <textarea
              value={template}
              onChange={(e) => updateTemplate(index, e.target.value)}
              rows={5}
              className="block w-full rounded-md border border-slate-300 p-3 font-mono text-sm shadow-sm"
              placeholder="Olá, {{nome}}!..."
            />

            <div className="mt-2 flex flex-wrap gap-1">
              {CHARGE_MESSAGE_PLACEHOLDERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => insertPlaceholder(index, item.key)}
                  className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
                  title={item.label}
                >
                  {item.key}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addTemplate}
        className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        + Adicionar mensagem
      </button>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Delay entre mensagens (segundos)
        </label>
        <input
          type="number"
          min={0}
          max={30}
          step={0.5}
          value={value.delayMs / 1000}
          onChange={(e) =>
            onChange({
              ...value,
              delayMs: Math.round(Number(e.target.value || 0) * 1000),
            })
          }
          className="mt-1 block w-32 rounded-md border border-slate-300 p-2 text-sm shadow-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          Padrão: {DEFAULT_CHARGE_MESSAGE_DELAY_MS / 1000}s entre cada envio.
        </p>
      </div>

      <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
        <p className="text-sm font-medium text-slate-900">
          {previewContext ? 'Prévia com dados desta fatura' : 'Preview da sequência'}
        </p>
        <div className="mt-3 space-y-3">
          {previewMessages.map((message, index) => (
            <div key={index} className="rounded-md bg-white p-3 shadow-sm">
              <p className="mb-1 text-xs font-medium text-slate-500">Mensagem {index + 1}</p>
              <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-800">
                {message}
              </pre>
            </div>
          ))}
        </div>
      </div>
      </>
      ) : null}
    </div>
  );
};
