import React from 'react';

interface RememberMeCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const RememberMeCheckbox: React.FC<RememberMeCheckboxProps> = ({
  id,
  checked,
  onChange,
  label = 'Lembrar meu e-mail neste dispositivo',
}) => (
  <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
    />
    <span>{label}</span>
  </label>
);
