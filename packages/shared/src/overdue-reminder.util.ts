export const DEFAULT_OVERDUE_REMINDER_DAYS = [1, 7, 15] as const;
export const DEFAULT_OVERDUE_REMINDER_FAILURE_GRACE_DAYS = 1;
export const MAX_OVERDUE_REMINDER_WINDOWS = 5;
export const DEFAULT_BILLING_TIMEZONE = 'America/Sao_Paulo';

/**
 * Normalizes overdue reminder window days: unique integers >= 1, sorted, max 5 entries.
 */
export function normalizeOverdueReminderDays(days: number[]): number[] {
  const unique = [...new Set(days.filter((day) => Number.isInteger(day) && day >= 1))];
  return unique.sort((a, b) => a - b).slice(0, MAX_OVERDUE_REMINDER_WINDOWS);
}

/**
 * Returns a YYYY-MM-DD calendar key for the given instant in the tenant timezone.
 */
export function getCalendarDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Parses a YYYY-MM-DD calendar key into UTC midnight for that calendar day.
 */
export function parseCalendarDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Counts whole calendar days elapsed since the due date (exclusive of due day) in the tenant timezone.
 * Example: due 10/06, today 11/06 → 1 day overdue.
 */
export function calendarDaysSinceDue(
  dueDate: Date,
  referenceDate: Date,
  timeZone: string = DEFAULT_BILLING_TIMEZONE,
): number {
  const dueKey = getCalendarDateKey(dueDate, timeZone);
  const todayKey = getCalendarDateKey(referenceDate, timeZone);
  const dueUtc = parseCalendarDateKey(dueKey);
  const todayUtc = parseCalendarDateKey(todayKey);
  const diffMs = todayUtc.getTime() - dueUtc.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export interface OverdueWindowEligibilityParams {
  dueDate: Date;
  windowDaysAfterDue: number;
  failureGraceDays: number;
  referenceDate: Date;
  timeZone?: string;
}

/**
 * Returns true when today falls within the ideal overdue window day or its failure grace period.
 */
export function isOverdueWindowEligible(params: OverdueWindowEligibilityParams): boolean {
  const timeZone = params.timeZone ?? DEFAULT_BILLING_TIMEZONE;
  const daysSinceDue = calendarDaysSinceDue(params.dueDate, params.referenceDate, timeZone);
  const windowStart = params.windowDaysAfterDue;
  const windowEnd = params.windowDaysAfterDue + params.failureGraceDays;
  return daysSinceDue >= windowStart && daysSinceDue <= windowEnd;
}
