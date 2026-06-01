import React, { useState } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';

interface PasswordInputProps {
  id: string;
  label: string;
  icon?: LucideIcon;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  registration: React.InputHTMLAttributes<HTMLInputElement>;
  /** Extra classes on the input (e.g. pr padding when no toggle needed — toggle always shown) */
  className?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  label,
  icon: Icon,
  error,
  autoComplete,
  placeholder = '••••••••',
  registration,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="h-4 w-4 text-slate-400" aria-hidden />
          </div>
        ) : null}
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          {...registration}
          className={`block w-full rounded-lg border bg-white py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
            Icon ? 'pl-10' : 'pl-3'
          } pr-10 ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20'} ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
    </div>
  );
};
