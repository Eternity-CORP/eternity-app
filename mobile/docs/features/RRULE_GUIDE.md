# 📅 RRULE Guide for Scheduled Payments

**Complete guide to recurring schedules with RRULE**

## 🎯 Overview

Scheduled Payments uses **RRULE** (Recurrence Rule) from RFC 5545 to define recurring schedules. This guide explains how RRULE works, how to use it, and how it handles timezones and DST.

## 📚 What is RRULE?

RRULE is a standard format for describing recurring events. It's used in calendar applications (iCal, Google Calendar, Outlook) and is defined in [RFC 5545](https://tools.ietf.org/html/rfc5545).

### Basic Format

```
FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20250111T090000Z
```

Components:
- `FREQ` - Frequency (DAILY, WEEKLY, MONTHLY, YEARLY)
- `BYHOUR` - Hour of day (0-23)
- `BYMINUTE` - Minute of hour (0-59)
- `DTSTART` - Start date/time
- `BYDAY` - Days of week (MO, TU, WE, TH, FR, SA, SU)
- `BYMONTHDAY` - Day of month (1-31)
- `INTERVAL` - Interval between occurrences
- `COUNT` - Number of occurrences
- `UNTIL` - End date

## 🔄 Common Patterns

### Daily

**Every day at 9 AM:**
```
FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20250111T090000Z
```

**Every 2 days at 3 PM:**
```
FREQ=DAILY;INTERVAL=2;BYHOUR=15;BYMINUTE=0;DTSTART=20250111T150000Z
```

### Weekly

**Every Monday at 9 AM:**
```
FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0;DTSTART=20250113T090000Z
```

**Weekdays (Mon-Fri) at 9 AM:**
```
FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=9;BYMINUTE=0;DTSTART=20250113T090000Z
```

**Every 2 weeks on Monday and Wednesday:**
```
FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;BYHOUR=9;BYMINUTE=0;DTSTART=20250113T090000Z
```

### Monthly

**1st of every month at 9 AM:**
```
FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=9;BYMINUTE=0;DTSTART=20250101T090000Z
```

**15th and last day of every month:**
```
FREQ=MONTHLY;BYMONTHDAY=15,-1;BYHOUR=9;BYMINUTE=0;DTSTART=20250115T090000Z
```

**First Monday of every month:**
```
FREQ=MONTHLY;BYDAY=1MO;BYHOUR=9;BYMINUTE=0;DTSTART=20250106T090000Z
```

### Yearly

**Every January 1st at 9 AM:**
```
FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1;BYHOUR=9;BYMINUTE=0;DTSTART=20250101T090000Z
```

## 🌍 Timezones and DST

### How Timezones Work

The Scheduled Payments system stores a timezone (IANA format) with each payment:
- `America/New_York`
- `Europe/London`
- `Asia/Tokyo`
- `Australia/Sydney`

The `rrule` library automatically handles DST transitions based on the DTSTART time.

### DST Behavior

**Spring Forward (Clock moves ahead):**
- If scheduled time falls in the "missing hour", it's adjusted forward
- Example: 2:30 AM on DST day → 3:30 AM

**Fall Back (Clock moves back):**
- If scheduled time occurs twice, the first occurrence is used
- Example: 1:30 AM on DST day → 1:30 AM (first occurrence)

### Example: Daily 9 AM across DST

```typescript
const payment = {
  rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20240308T090000',
  tz: 'America/New_York',
};

// March 8, 2024: 9 AM EST (UTC-5)
// March 9, 2024: 9 AM EST (UTC-5)
// March 10, 2024: DST starts (2 AM → 3 AM)
// March 11, 2024: 9 AM EDT (UTC-4) ← Still 9 AM local time!
```

The payment always runs at 9 AM local time, even though the UTC offset changes from -5 to -4.

## 🚫 Excluded Dates (exDates)

You can exclude specific dates from a recurring schedule:

```typescript
const payment = {
  rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20250111T090000Z',
  tz: 'UTC',
  exDates: [
    new Date('2025-01-15T09:00:00Z').getTime(), // Skip Jan 15
    new Date('2025-01-20T09:00:00Z').getTime(), // Skip Jan 20
  ],
};
```

**Use cases:**
- Skip holidays
- Skip specific dates when you'll be unavailable
- Temporarily pause without changing the schedule

## 🔧 Creating RRULEs

### Using Helpers

```typescript
import {
  createDailyRRule,
  createWeeklyRRule,
  createMonthlyRRule,
} from './utils/time-helpers';

// Daily at 9 AM
const daily = createDailyRRule(new Date(), 9, 0);

// Weekdays at 9 AM
const weekdays = createWeeklyRRule(new Date(), [0, 1, 2, 3, 4], 9, 0);

// 1st of month at 9 AM
const monthly = createMonthlyRRule(new Date(), 1, 9, 0);
```

### Manual Construction

```typescript
// Every day at 9:30 AM
const rrule = 'FREQ=DAILY;BYHOUR=9;BYMINUTE=30;DTSTART=20250111T093000Z';

// Every Monday and Friday at 2 PM
const rrule = 'FREQ=WEEKLY;BYDAY=MO,FR;BYHOUR=14;BYMINUTE=0;DTSTART=20250113T140000Z';
```

## 📖 Reading RRULEs

### Human-Readable Description

```typescript
import { describeRRule } from './utils/time-helpers';

const rrule = 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20250111T090000Z';
const description = describeRRule(rrule);
// "Every day at 9:00 AM"
```

### Parsing

```typescript
import { parseRRuleWithExDates } from './utils/time-helpers';

const ruleSet = parseRRuleWithExDates(
  'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20250111T090000Z',
  'America/New_York',
  [excludedDate1, excludedDate2]
);

// Get next occurrence
const next = ruleSet.after(new Date(), false);
```

## 🎨 UI Presets

The `RecurringSchedulePicker` component provides quick presets:

- **Every day at 9 AM**
- **Weekdays at 9 AM** (Mon-Fri)
- **Every Monday at 9 AM**
- **1st of every month at 9 AM**

Users can also customize:
- Frequency (daily/weekly/monthly)
- Time (hour and minute)
- Days of week (for weekly)
- Day of month (for monthly)

## ⚠️ Important Notes

### Timezone Storage

Always store the user's timezone with the payment:

```typescript
const payment = {
  rrule: '...',
  tz: Intl.DateTimeFormat().resolvedOptions().timeZone, // User's timezone
};
```

### DTSTART Format

DTSTART should be in UTC format:
- `20250111T090000Z` ✅ (UTC)
- `20250111T090000` ❌ (No timezone)

### Validation

Always validate RRULEs before saving:

```typescript
import { isValidRRule } from './utils/time-helpers';

if (!isValidRRule(rrule)) {
  throw new Error('Invalid RRULE format');
}
```

## 🧪 Testing

### Test DST Transitions

```typescript
// Test spring forward
const payment = {
  rrule: 'FREQ=DAILY;BYHOUR=2;BYMINUTE=30;DTSTART=20240308T023000',
  tz: 'America/New_York',
};

// March 10, 2024: 2:30 AM doesn't exist (DST starts)
const next = computeNextRunAt(payment, new Date('2024-03-09T10:00:00Z'));
// Should skip to 3:30 AM or next valid time
```

### Test Fall Back

```typescript
// Test fall back
const payment = {
  rrule: 'FREQ=DAILY;BYHOUR=1;BYMINUTE=30;DTSTART=20241101T013000',
  tz: 'America/New_York',
};

// November 3, 2024: 1:30 AM occurs twice (DST ends)
const next = computeNextRunAt(payment, new Date('2024-11-02T10:00:00Z'));
// Should use first occurrence
```

## 📊 Examples

### Salary Payment

```typescript
// 1st of every month at 9 AM
{
  kind: 'recurring',
  rrule: 'FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=9;BYMINUTE=0;DTSTART=20250101T090000Z',
  tz: 'America/New_York',
  amountHuman: '5000',
  to: '0xEmployeeAddress...',
}
```

### Weekly Subscription

```typescript
// Every Monday at 9 AM
{
  kind: 'recurring',
  rrule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0;DTSTART=20250113T090000Z',
  tz: 'UTC',
  amountHuman: '10',
  to: '0xSubscriptionAddress...',
}
```

### Bi-Weekly Payment

```typescript
// Every 2 weeks on Friday at 5 PM
{
  kind: 'recurring',
  rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=FR;BYHOUR=17;BYMINUTE=0;DTSTART=20250110T170000Z',
  tz: 'Europe/London',
  amountHuman: '1000',
  to: '0xContractorAddress...',
}
```

## 🔍 Debugging

### Check Next Run

```typescript
import { computeNextRunAt } from './utils/time-helpers';

const payment = { /* ... */ };
const nextRun = computeNextRunAt(payment);

console.log('Next run:', new Date(nextRun!).toLocaleString());
```

### Validate RRULE

```typescript
import { parseRRuleWithExDates } from './utils/time-helpers';

try {
  const ruleSet = parseRRuleWithExDates(rrule, tz);
  console.log('Valid RRULE');
} catch (error) {
  console.error('Invalid RRULE:', error.message);
}
```

### Test Occurrences

```typescript
const ruleSet = parseRRuleWithExDates(rrule, tz);

// Get next 5 occurrences
const occurrences = ruleSet.all((date, i) => i < 5);

occurrences.forEach((date, i) => {
  console.log(`${i + 1}. ${date.toLocaleString()}`);
});
```

## 📚 Resources

- [RFC 5545 (iCalendar)](https://tools.ietf.org/html/rfc5545)
- [rrule.js Documentation](https://github.com/jakubroztocil/rrule)
- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [DST Explained](https://en.wikipedia.org/wiki/Daylight_saving_time)

## 🎉 Summary

- ✅ RRULE is a standard format for recurring schedules
- ✅ Supports daily, weekly, monthly, yearly patterns
- ✅ Automatically handles DST transitions
- ✅ Can exclude specific dates with exDates
- ✅ Always store timezone with payment
- ✅ Use helpers for common patterns
- ✅ Validate before saving
- ✅ Test DST transitions thoroughly

---

**Last Updated:** 2025-11-11
**Version:** 1.0.0
