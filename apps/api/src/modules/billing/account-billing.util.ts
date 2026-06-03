/**
 * Utilities for SaaS account subscription billing dates.
 */

/** Caps billing day to 28 to avoid invalid dates in shorter months. */
export function dueDayFromDate(date: Date): number {
  return Math.min(date.getDate(), 28);
}

/** Returns YYYY-MM cycle key from a due date. */
export function billingCycleKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Parses YYYY-MM-DD (or ISO) into a date at noon local time. */
export function parseDueDateInput(value: string): Date {
  const normalized = value.includes('T') ? value : `${value}T12:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid due date');
  }
  return date;
}

/** Default first due date: given day (1-28) in current or next month. */
export function defaultNextDueDate(dueDay = 10, reference = new Date()): Date {
  const day = Math.min(Math.max(dueDay, 1), 28);
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const candidate = new Date(year, month, day, 12, 0, 0, 0);
  if (candidate >= new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())) {
    return candidate;
  }
  return new Date(year, month + 1, day, 12, 0, 0, 0);
}

/** Advances next due date by one billing month keeping due day capped at 28. */
export function advanceNextDueDate(current: Date): Date {
  const dueDay = dueDayFromDate(current);
  const next = new Date(current.getFullYear(), current.getMonth() + 1, 1, 12, 0, 0, 0);
  const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(dueDay, lastDayOfMonth));
  return next;
}
