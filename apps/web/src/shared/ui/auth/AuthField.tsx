import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { PasswordInput } from '../forms/PasswordInput';

interface AuthFieldProps {
  id: string;
  label: string;
  type?: string;
  icon: LucideIcon;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  registration: React.InputHTMLAttributes<HTMLInputElement>;
}

export const AuthField: React.FC<AuthFieldProps> = ({
  id,
  label,
  type = 'text',
  icon,
  error,
  autoComplete,
  placeholder,
  registration,
}) => {
  if (type === 'password') {
    return (
      <PasswordInput
        id={id}
        label={label}
        icon={icon}
        error={error}
        autoComplete={autoComplete}
        placeholder={placeholder}
        registration={registration}
      />
    );
  }

  const Icon = icon;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icon className="h-4 w-4 text-slate-400" aria-hidden />
        </div>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          {...registration}
          className={`block w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
              : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20'
          }`}
        />
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
    </div>
  );
};
