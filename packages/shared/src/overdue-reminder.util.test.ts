import { describe, expect, it } from 'vitest';
import {
  calendarDaysSinceDue,
  isOverdueWindowEligible,
  normalizeOverdueReminderDays,
} from './overdue-reminder.util';

describe('normalizeOverdueReminderDays', () => {
  it('testNormalizeOverdueReminderDays_whenDuplicatesAndUnsorted_shouldReturnSortedUnique', () => {
    expect(normalizeOverdueReminderDays([15, 1, 7, 1, 0, -2])).toEqual([1, 7, 15]);
  });

  it('testNormalizeOverdueReminderDays_whenMoreThanFive_shouldCapAtFive', () => {
    expect(normalizeOverdueReminderDays([1, 2, 3, 4, 5, 6, 7])).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('calendarDaysSinceDue', () => {
  it('testCalendarDaysSinceDue_whenDueYesterday_shouldReturnOne', () => {
    const dueDate = new Date('2026-06-10T15:00:00.000Z');
    const today = new Date('2026-06-11T10:00:00.000Z');
    expect(calendarDaysSinceDue(dueDate, today, 'America/Sao_Paulo')).toBe(1);
  });

  it('testCalendarDaysSinceDue_whenDueToday_shouldReturnZero', () => {
    const dueDate = new Date('2026-06-10T15:00:00.000Z');
    const today = new Date('2026-06-10T20:00:00.000Z');
    expect(calendarDaysSinceDue(dueDate, today, 'America/Sao_Paulo')).toBe(0);
  });
});

describe('isOverdueWindowEligible', () => {
  const dueDate = new Date('2026-06-10T12:00:00.000Z');

  it('testIsOverdueWindowEligible_whenOnIdealDay_shouldReturnTrue', () => {
    expect(
      isOverdueWindowEligible({
        dueDate,
        windowDaysAfterDue: 1,
        failureGraceDays: 1,
        referenceDate: new Date('2026-06-11T12:00:00.000Z'),
      }),
    ).toBe(true);
  });

  it('testIsOverdueWindowEligible_whenWithinGrace_shouldReturnTrue', () => {
    expect(
      isOverdueWindowEligible({
        dueDate,
        windowDaysAfterDue: 1,
        failureGraceDays: 1,
        referenceDate: new Date('2026-06-12T12:00:00.000Z'),
      }),
    ).toBe(true);
  });

  it('testIsOverdueWindowEligible_whenAfterGrace_shouldReturnFalse', () => {
    expect(
      isOverdueWindowEligible({
        dueDate,
        windowDaysAfterDue: 1,
        failureGraceDays: 1,
        referenceDate: new Date('2026-06-13T12:00:00.000Z'),
      }),
    ).toBe(false);
  });

  it('testIsOverdueWindowEligible_whenBeforeWindow_shouldReturnFalse', () => {
    expect(
      isOverdueWindowEligible({
        dueDate,
        windowDaysAfterDue: 7,
        failureGraceDays: 1,
        referenceDate: new Date('2026-06-11T12:00:00.000Z'),
      }),
    ).toBe(false);
  });
});
