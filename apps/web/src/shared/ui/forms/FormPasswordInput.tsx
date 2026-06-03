import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { FormField } from './FormField';
import { formInputClass, formInputPaddingWithBoth } from './form-styles';

interface FormPasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  hint?: string;
  showLockIcon?: boolean;
}

export const FormPasswordInput = React.forwardRef<HTMLInputElement, FormPasswordInputProps>(
  (
    {
      label,
      error,
      hint,
      showLockIcon = true,
      className = '',
      id,
      value,
      onChange,
      onBlur,
      name,
      ...rest
    },
    ref,
  ) => {
    const [visible, setVisible] = useState(false);
    const inputId = id ?? name?.toString();

    return (
      <FormField
        label={label}
        htmlFor={inputId}
        error={error}
        hint={hint}
        prefixIcon={showLockIcon ? Lock : undefined}
        suffixIcon={visible ? EyeOff : Eye}
        onSuffixClick={() => setVisible((current) => !current)}
        suffixAriaLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
      >
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete="off"
          value={value ?? ''}
          onChange={onChange}
          onBlur={onBlur}
          className={`${formInputClass} ${formInputPaddingWithBoth} ${className}`.trim()}
          {...rest}
        />
      </FormField>
    );
  },
);

FormPasswordInput.displayName = 'FormPasswordInput';
