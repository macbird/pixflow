/** Checkout-style form tokens (Poppins, gray fields, prefix/suffix icons). */

export const formRootClass = 'font-form';

export const formLabelClass = 'mb-1.5 block text-xs font-medium text-slate-600';

export const formHintClass = 'mt-1.5 text-xs text-slate-500';

export const formErrorClass = 'mt-1.5 text-xs font-medium text-red-600';

/** Shell around control + icons (same gray fill as input). */
export const formFieldShellClass = 'relative';

/** Matches single-line inputs (`py-3` + 15px text) for aligned form grids. */
export const formControlHeightClass = 'h-12';

export const formInputClass =
  'w-full rounded-[10px] border-0 bg-form-field py-3 text-[15px] font-normal leading-snug text-slate-900 placeholder:text-slate-400 outline-none transition-[box-shadow,background-color] focus:bg-white focus:ring-2 focus:ring-form-primary/20 disabled:cursor-not-allowed disabled:opacity-60';

export const formInputPaddingDefault = 'px-4';

export const formInputPaddingWithPrefix = 'pl-11 pr-4';

export const formInputPaddingWithSuffix = 'pl-4 pr-11';

export const formInputPaddingWithBoth = 'pl-11 pr-11';

export const formIconPrefixClass =
  'pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400';

export const formIconSuffixClass =
  'absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400';

export const formIconSizeClass = 'h-[18px] w-[18px]';

/** Hides the native select arrow so only the custom chevron is shown. */
export const formSelectAppearanceClass =
  'cursor-pointer appearance-none [-webkit-appearance:none] [-moz-appearance:none] [&::-ms-expand]:hidden';

export const formSelectClass = `${formInputClass} ${formInputPaddingWithSuffix} ${formSelectAppearanceClass}`;

export const formTextareaClass = `${formInputClass} ${formInputPaddingDefault} min-h-[5.5rem] resize-y leading-relaxed`;

export const formSectionClass = 'space-y-4';

export const formGridClass = 'grid grid-cols-1 gap-4 md:grid-cols-2';

export const formFooterClass = 'mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5';

export const formCancelButtonClass =
  'w-full rounded-[10px] border-0 bg-form-field px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200/80 disabled:opacity-50';

export const formSubmitButtonClass =
  'w-full rounded-[10px] bg-form-primary px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-form-primary-hover disabled:opacity-50';

export const formDangerSubmitButtonClass =
  'w-full rounded-[10px] bg-red-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50';

export function formInputPaddingClass(options: { hasPrefix?: boolean; hasSuffix?: boolean }): string {
  if (options.hasPrefix && options.hasSuffix) return formInputPaddingWithBoth;
  if (options.hasPrefix) return formInputPaddingWithPrefix;
  if (options.hasSuffix) return formInputPaddingWithSuffix;
  return formInputPaddingDefault;
}
