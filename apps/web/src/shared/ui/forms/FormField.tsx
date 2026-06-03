import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  formErrorClass,
  formFieldShellClass,
  formHintClass,
  formIconPrefixClass,
  formIconSizeClass,
  formIconSuffixClass,
  formLabelClass,
} from './form-styles';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  prefixIcon?: LucideIcon;
  suffixIcon?: LucideIcon;
  /** Inline content on the right inside the field (e.g. badge text). */
  suffixAdornment?: React.ReactNode;
  onSuffixClick?: () => void;
  suffixAriaLabel?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  error,
  hint,
  prefixIcon: PrefixIcon,
  suffixIcon: SuffixIcon,
  suffixAdornment,
  onSuffixClick,
  suffixAriaLabel,
  children,
}) => {
  const suffixIsButton = Boolean(SuffixIcon && onSuffixClick);

  return (
    <div>
      <label htmlFor={htmlFor} className={formLabelClass}>
        {label}
      </label>
      <div className={formFieldShellClass}>
        {PrefixIcon ? (
          <div className={formIconPrefixClass} aria-hidden>
            <PrefixIcon className={formIconSizeClass} strokeWidth={1.75} />
          </div>
        ) : null}

        {children}

        {suffixAdornment ? (
          <div className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2">
            {suffixAdornment}
          </div>
        ) : null}

        {SuffixIcon ? (
          suffixIsButton ? (
            <button
              type="button"
              onClick={onSuffixClick}
              className={`${formIconSuffixClass} hover:text-slate-600`}
              aria-label={suffixAriaLabel}
              tabIndex={-1}
            >
              <SuffixIcon className={formIconSizeClass} strokeWidth={1.75} />
            </button>
          ) : (
            <div className={`${formIconSuffixClass} pointer-events-none`} aria-hidden>
              <SuffixIcon className={formIconSizeClass} strokeWidth={1.75} />
            </div>
          )
        ) : null}
      </div>
      {error ? <p className={formErrorClass}>{error}</p> : null}
      {!error && hint ? <p className={formHintClass}>{hint}</p> : null}
    </div>
  );
};
