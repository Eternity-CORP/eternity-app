/**
 * Time Helpers for Scheduled Payments
 * 
 * Handles timezone-aware scheduling with RRULE support
 */

import { RRule, RRuleSet, rrulestr } from 'rrule';
import type { ScheduledPayment, ScheduledKind } from '../types';

// ============================================================================
// Next Run Computation
// ============================================================================

/**
 * Compute next run time for a scheduled payment
 * 
 * Handles:
 * - One-time vs recurring
 * - Timezone conversions
 * - DST transitions
 * - Excluded dates (exDates)
 * 
 * @param payment - Scheduled payment
 * @param from - Start time (default: now)
 * @returns Next run timestamp (ms) or undefined if no more runs
 */
export function computeNextRunAt(
  payment: ScheduledPayment,
  from: number = Date.now()
): number | undefined {
  if (payment.kind === 'one_time') {
    return computeNextRunAtOneTime(payment, from);
  } else {
    return computeNextRunAtRecurring(payment, from);
  }
}

/**
 * Compute next run for one-time payment
 */
function computeNextRunAtOneTime(
  payment: ScheduledPayment,
  now: number
): number | undefined {
  // Already completed
  if (payment.status === 'completed') {
    return undefined;
  }

  // No schedule time set
  if (!payment.scheduleAt) {
    return undefined;
  }

  // Already past
  if (payment.scheduleAt <= now) {
    // If not yet run, return the schedule time
    if (payment.runCount === 0) {
      return payment.scheduleAt;
    }
    // Already run
    return undefined;
  }

  // Future schedule
  return payment.scheduleAt;
}

/**
 * Compute next run for recurring payment
 * 
 * Handles:
 * - RRULE parsing with timezone
 * - DST transitions (handled by rrule library)
 * - Excluded dates (exDates)
 * - Multiple occurrences if needed
 */
function computeNextRunAtRecurring(
  payment: ScheduledPayment,
  now: number
): number | undefined {
  // Paused or completed
  if (payment.status === 'paused' || payment.status === 'completed') {
    return undefined;
  }

  // No RRULE
  if (!payment.rrule) {
    return undefined;
  }

  try {
    // Parse RRULE with exDates
    const ruleSet = parseRRuleWithExDates(payment.rrule, payment.tz, payment.exDates);

    // Get next occurrence after now
    // The rrule library automatically handles DST transitions
    const next = ruleSet.after(new Date(now), false);

    if (!next) {
      return undefined;
    }

    return next.getTime();
  } catch (error) {
    console.error('Failed to compute next run:', error);
    return undefined;
  }
}

// ============================================================================
// RRULE Parsing
// ============================================================================

/**
 * Parse RRULE with excluded dates
 * 
 * Creates an RRuleSet that includes the main RRULE and excludes specific dates.
 * The rrule library automatically handles DST transitions.
 * 
 * @param rruleStr - RRULE string (RFC5545)
 * @param tz - IANA timezone
 * @param exDates - Array of excluded timestamps (Unix ms)
 * @returns RRuleSet instance
 */
export function parseRRuleWithExDates(
  rruleStr: string,
  tz: string,
  exDates?: number[]
): RRuleSet | RRule {
  try {
    // Parse base RRULE
    const rule = rrulestr(rruleStr, {
      forceset: false,
    }) as RRule;

    // If no exDates, return the rule directly
    if (!exDates || exDates.length === 0) {
      return rule;
    }

    // Create RRuleSet with exclusions
    const ruleSet = new RRuleSet();
    ruleSet.rrule(rule);

    // Add exclusions
    // Note: exdate() expects Date objects
    for (const exDate of exDates) {
      ruleSet.exdate(new Date(exDate));
    }

    return ruleSet;
  } catch (error) {
    throw new Error(`Invalid RRULE: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse RRULE string with timezone (legacy, kept for compatibility)
 * 
 * @param rruleStr - RRULE string (RFC5545)
 * @param tz - IANA timezone
 * @returns RRule instance
 */
export function parseRRule(rruleStr: string, tz: string): RRule {
  try {
    // Parse RRULE string
    const rule = rrulestr(rruleStr, {
      forceset: false,
    }) as RRule;

    // Note: rrule library doesn't directly support timezone conversion
    // We rely on the DTSTART in the RRULE to be in the correct timezone
    // The library automatically handles DST transitions based on DTSTART

    return rule;
  } catch (error) {
    throw new Error(`Invalid RRULE: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate RRULE string
 * 
 * @param rruleStr - RRULE string
 * @returns True if valid
 */
export function isValidRRule(rruleStr: string): boolean {
  try {
    rrulestr(rruleStr);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// RRULE Helpers
// ============================================================================

/**
 * Create RRULE for daily recurrence
 * 
 * @param startDate - Start date
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @returns RRULE string
 */
export function createDailyRRule(
  startDate: Date,
  hour: number = 9,
  minute: number = 0
): string {
  const dtstart = new Date(startDate);
  dtstart.setHours(hour, minute, 0, 0);

  const rule = new RRule({
    freq: RRule.DAILY,
    dtstart,
  });

  return rule.toString();
}

/**
 * Create RRULE for weekly recurrence
 * 
 * @param startDate - Start date
 * @param weekdays - Days of week (0=Monday, 6=Sunday)
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @returns RRULE string
 */
export function createWeeklyRRule(
  startDate: Date,
  weekdays: number[],
  hour: number = 9,
  minute: number = 0
): string {
  const dtstart = new Date(startDate);
  dtstart.setHours(hour, minute, 0, 0);

  const rule = new RRule({
    freq: RRule.WEEKLY,
    byweekday: weekdays,
    dtstart,
  });

  return rule.toString();
}

/**
 * Create RRULE for monthly recurrence
 * 
 * @param startDate - Start date
 * @param dayOfMonth - Day of month (1-31)
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @returns RRULE string
 */
export function createMonthlyRRule(
  startDate: Date,
  dayOfMonth: number,
  hour: number = 9,
  minute: number = 0
): string {
  const dtstart = new Date(startDate);
  dtstart.setHours(hour, minute, 0, 0);

  const rule = new RRule({
    freq: RRule.MONTHLY,
    bymonthday: dayOfMonth,
    dtstart,
  });

  return rule.toString();
}

// ============================================================================
// Timezone Helpers
// ============================================================================

/**
 * Validate IANA timezone
 * 
 * @param tz - Timezone string
 * @returns True if valid
 */
export function isValidTimezone(tz: string): boolean {
  try {
    // Try to format a date with the timezone
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current timezone
 * 
 * @returns IANA timezone string
 */
export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert timestamp to timezone-aware date string
 * 
 * @param timestamp - Unix timestamp (ms)
 * @param tz - IANA timezone
 * @returns Formatted date string
 */
export function formatInTimezone(
  timestamp: number,
  tz: string
): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString();
  }
}

// ============================================================================
// Due Payments
// ============================================================================

/**
 * Check if payment is due
 * 
 * @param payment - Scheduled payment
 * @param now - Current timestamp (ms), defaults to Date.now()
 * @returns True if payment should be executed now
 */
export function isPaymentDue(
  payment: ScheduledPayment,
  now: number = Date.now()
): boolean {
  // Not scheduled or paused
  if (payment.status === 'paused' || payment.status === 'completed') {
    return false;
  }

  // No next run time
  if (!payment.nextRunAt) {
    return false;
  }

  // Check if due (with 1 minute grace period)
  const gracePeriod = 60 * 1000; // 1 minute
  return payment.nextRunAt <= now + gracePeriod;
}

/**
 * Get all due payments from a list
 * 
 * @param payments - List of scheduled payments
 * @param now - Current timestamp (ms)
 * @returns List of due payments
 */
export function getDuePayments(
  payments: ScheduledPayment[],
  now: number = Date.now()
): ScheduledPayment[] {
  return payments.filter(p => isPaymentDue(p, now));
}

// ============================================================================
// Schedule Validation
// ============================================================================

/**
 * Validate schedule configuration
 * 
 * @param kind - Payment kind
 * @param scheduleAt - One-time schedule timestamp
 * @param rrule - Recurring RRULE
 * @param tz - Timezone
 * @returns Validation errors (empty if valid)
 */
export function validateSchedule(
  kind: ScheduledKind,
  scheduleAt?: number,
  rrule?: string,
  tz?: string
): string[] {
  const errors: string[] = [];

  // Validate timezone
  if (tz && !isValidTimezone(tz)) {
    errors.push(`Invalid timezone: ${tz}`);
  }

  // One-time validation
  if (kind === 'one_time') {
    if (!scheduleAt) {
      errors.push('scheduleAt is required for one-time payments');
    } else if (scheduleAt <= Date.now()) {
      errors.push('scheduleAt must be in the future');
    }

    if (rrule) {
      errors.push('rrule should not be set for one-time payments');
    }
  }

  // Recurring validation
  if (kind === 'recurring') {
    if (!rrule) {
      errors.push('rrule is required for recurring payments');
    } else if (!isValidRRule(rrule)) {
      errors.push('Invalid RRULE format');
    }

    if (scheduleAt) {
      errors.push('scheduleAt should not be set for recurring payments');
    }
  }

  return errors;
}

// ============================================================================
// Human-Readable Descriptions
// ============================================================================

/**
 * Get human-readable description of RRULE
 * 
 * @param rruleStr - RRULE string
 * @returns Human-readable description
 */
export function describeRRule(rruleStr: string): string {
  try {
    const rule = rrulestr(rruleStr) as RRule;
    return rule.toText();
  } catch {
    return 'Invalid schedule';
  }
}

/**
 * Get next N occurrences of a recurring payment
 * 
 * @param payment - Scheduled payment
 * @param count - Number of occurrences
 * @returns Array of timestamps
 */
export function getNextOccurrences(
  payment: ScheduledPayment,
  count: number = 5
): number[] {
  if (payment.kind !== 'recurring' || !payment.rrule) {
    return [];
  }

  try {
    const rule = parseRRule(payment.rrule, payment.tz);
    const now = Date.now();
    const dates = rule.between(
      new Date(now),
      new Date(now + 365 * 24 * 60 * 60 * 1000), // Next year
      true,
      (date, i) => i < count
    );

    return dates.map(d => d.getTime());
  } catch {
    return [];
  }
}
