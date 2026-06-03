import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { FormField } from './FormField';
import { formInputClass, formInputPaddingClass } from './form-styles';

export interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string;
  error?: string;
  hint?: string;
  prefixIcon?: LucideIcon;
  suffixIcon?: LucideIcon;
  suffixAdornment?: React.ReactNode;
  onSuffixClick?: () => void;
  suffixAriaLabel?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      error,
      hint,
      prefixIcon,
      suffixIcon,
      suffixAdornment,
      onSuffixClick,
      suffixAriaLabel,
      className = '',
      id,
      name,
      ...rest
    },
    ref,
  ) => {
    const inputId = id ?? name?.toString();
    const padding = formInputPaddingClass({
      hasPrefix: Boolean(prefixIcon),
      hasSuffix: Boolean(suffixIcon || suffixAdornment),
    });

    return (
      <FormField
        label={label}
        htmlFor={inputId}
        error={error}
        hint={hint}
        prefixIcon={prefixIcon}
        suffixIcon={suffixIcon}
        suffixAdornment={suffixAdornment}
        onSuffixClick={onSuffixClick}
        suffixAriaLabel={suffixAriaLabel}
      >
        <input
          ref={ref}
          id={inputId}
          name={name}
          className={`${formInputClass} ${padding} ${className}`.trim()}
          {...rest}
        />
      </FormField>
    );
  },
);

FormInput.displayName = 'FormInput';
