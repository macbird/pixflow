import React from 'react';
import { NumericFormat, type NumericFormatProps } from 'react-number-format';

export interface CurrencyInputProps
  extends Omit<
    NumericFormatProps,
    'value' | 'onValueChange' | 'defaultValue' | 'type' | 'getInputRef'
  > {
  value: number | null | undefined;
  onChange: (value: number) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, onBlur, className, onFocus, ...rest }, ref) => {
    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      event.target.select();
      onFocus?.(event);
    };

    return (
      <NumericFormat
        getInputRef={ref}
        value={value ?? ''}
        onValueChange={(values) => {
          onChange(values.floatValue ?? 0);
        }}
        onBlur={onBlur}
        onFocus={handleFocus}
        thousandSeparator="."
        decimalSeparator=","
        prefix="R$ "
        decimalScale={2}
        allowNegative={false}
        inputMode="decimal"
        className={className}
        {...rest}
      />
    );
  },
);

CurrencyInput.displayName = 'CurrencyInput';
