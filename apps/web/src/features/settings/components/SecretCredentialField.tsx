import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SecretCredentialFieldProps {
  id: string;
  label: string;
  value: string;
  configured: boolean;
  onChange: (value: string) => void;
  emptyPlaceholder: string;
  configuredHint?: string;
}

/**
 * Password field for PSP secrets with a clear "already saved" state.
 */
export const SecretCredentialField: React.FC<SecretCredentialFieldProps> = ({
  id,
  label,
  value,
  configured,
  onChange,
  emptyPlaceholder,
  configuredHint = 'Salva no servidor — não exibida por segurança',
}) => {
  const isStoredOnly = configured && value.trim() === '';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="block text-xs font-medium text-slate-600" htmlFor={id}>
          {label}
        </label>
        {configured ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Configurada
          </span>
        ) : null}
      </div>

      {isStoredOnly ? (
        <div
          className="mt-1 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-2.5"
          aria-live="polite"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <div className="min-w-0">
            <p className="font-mono text-sm tracking-widest text-slate-600">••••••••••••••••</p>
            <p className="mt-0.5 text-xs text-emerald-800">{configuredHint}</p>
          </div>
        </div>
      ) : null}

      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          isStoredOnly
            ? 'Digite uma nova chave apenas se quiser substituir'
            : configured
              ? 'Nova chave (opcional — vazio mantém a atual)'
              : emptyPlaceholder
        }
        className={`block w-full rounded-md border border-slate-300 p-2 font-mono text-sm shadow-sm ${
          isStoredOnly ? 'mt-2' : 'mt-1'
        }`}
      />
    </div>
  );
};
