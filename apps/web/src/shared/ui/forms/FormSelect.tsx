import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FormField } from './FormField';
import {
  formIconSizeClass,
  formIconSuffixClass,
  formInputClass,
  formInputPaddingClass,
  formSelectAppearanceClass,
} from './form-styles';

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  prefixIcon?: LucideIcon;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, hint, prefixIcon, className = '', id, name, children, ...rest }, ref) => {
    const selectId = id ?? name?.toString();
    const padding = formInputPaddingClass({
      hasPrefix: Boolean(prefixIcon),
      hasSuffix: true,
    });

    return (
      <FormField label={label} htmlFor={selectId} error={error} hint={hint} prefixIcon={prefixIcon}>
        <select
          ref={ref}
          id={selectId}
          name={name}
          className={`${formInputClass} ${padding} ${formSelectAppearanceClass} ${className}`.trim()}
          {...rest}
        >
          {children}
        </select>
        <div className={`${formIconSuffixClass} pointer-events-none`} aria-hidden>
          <ChevronDown className={formIconSizeClass} strokeWidth={1.75} />
        </div>
      </FormField>
    );
  },
);

FormSelect.displayName = 'FormSelect';
