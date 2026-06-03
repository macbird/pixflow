import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  formErrorClass,
  formFieldShellClass,
  formIconPrefixClass,
  formIconSizeClass,
  formIconSuffixClass,
  formInputClass,
  formInputPaddingClass,
  formSelectAppearanceClass,
} from './form-styles';

export interface InlineFormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  prefixIcon?: LucideIcon;
  error?: string;
}

/** Select without label — for dense grids (e.g. connection rows). */
export const InlineFormSelect = React.forwardRef<HTMLSelectElement, InlineFormSelectProps>(
  ({ prefixIcon: PrefixIcon, error, className = '', id, name, children, ...rest }, ref) => {
    const padding = formInputPaddingClass({
      hasPrefix: Boolean(PrefixIcon),
      hasSuffix: true,
    });

    return (
      <div>
        <div className={formFieldShellClass}>
          {PrefixIcon ? (
            <div className={formIconPrefixClass} aria-hidden>
              <PrefixIcon className={formIconSizeClass} strokeWidth={1.75} />
            </div>
          ) : null}
          <select
            ref={ref}
            id={id}
            name={name}
            className={`${formInputClass} ${padding} ${formSelectAppearanceClass} text-sm ${className}`.trim()}
            {...rest}
          >
            {children}
          </select>
          <div className={`${formIconSuffixClass} pointer-events-none`} aria-hidden>
            <ChevronDown className={formIconSizeClass} strokeWidth={1.75} />
          </div>
        </div>
        {error ? <p className={formErrorClass}>{error}</p> : null}
      </div>
    );
  },
);

InlineFormSelect.displayName = 'InlineFormSelect';
