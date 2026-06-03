import React from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  formControlHeightClass,
  formErrorClass,
  formHintClass,
  formLabelClass,
} from './form-styles';

export interface FormNumberStepperProps {
  label: string;
  error?: string;
  hint?: string;
  value?: number | null;
  name?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange?: (value: number) => void;
  onBlur?: () => void;
}

function clamp(value: number, min: number, max?: number) {
  let next = Math.max(min, value);
  if (max != null) {
    next = Math.min(max, next);
  }
  return next;
}

function normalizeValue(value: number | null | undefined, min: number, max?: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return min;
  }
  return clamp(parsed, min, max);
}

const stepperButtonClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] transition-colors disabled:cursor-not-allowed disabled:opacity-40';

export const FormNumberStepper = React.forwardRef<HTMLInputElement, FormNumberStepperProps>(
  (
    {
      label,
      error,
      hint,
      value,
      name,
      min = 1,
      max,
      step = 1,
      disabled = false,
      onChange,
      onBlur,
    },
    ref,
  ) => {
    const current = normalizeValue(value, min, max);
    const atMin = current <= min;
    const atMax = max != null && current >= max;

    const emitChange = (next: number) => {
      onChange?.(clamp(next, min, max));
    };

    const handleDecrement = () => {
      if (disabled || atMin) return;
      emitChange(current - step);
    };

    const handleIncrement = () => {
      if (disabled || atMax) return;
      emitChange(current + step);
    };

    return (
      <div className="w-full">
        <span className={formLabelClass}>{label}</span>
        <div
          className={`flex ${formControlHeightClass} w-full items-center gap-1 rounded-[10px] bg-form-field px-1.5`}
          role="group"
          aria-label={label}
        >
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || atMin}
            className={`${stepperButtonClass} bg-white text-slate-800 shadow-sm hover:bg-slate-50`}
            aria-label={`Diminuir ${label}`}
          >
            <Minus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>

          <div
            className="flex min-w-0 flex-1 items-center justify-center text-[15px] font-semibold leading-none tabular-nums text-slate-900"
            aria-live="polite"
          >
            {current}
          </div>

          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || atMax}
            className={`${stepperButtonClass} bg-form-primary text-white hover:bg-form-primary-hover`}
            aria-label={`Aumentar ${label}`}
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <input
          ref={ref}
          type="hidden"
          name={name}
          value={current}
          readOnly
          tabIndex={-1}
          aria-hidden
          onBlur={onBlur}
        />

        {error ? <p className={formErrorClass}>{error}</p> : null}
        {!error && hint ? <p className={formHintClass}>{hint}</p> : null}
      </div>
    );
  },
);

FormNumberStepper.displayName = 'FormNumberStepper';
