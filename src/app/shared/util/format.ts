import { DatePipe, formatDate } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { IsoDateString, PersonRef } from '../../core/api/models';

// All date text goes through Angular's formatDate with one locale, so every screen spells
// months the same way ("28 Sep 2026").
const LOCALE = 'en-US';

/** Formats a UTC calendar date (e.g. 'MMMM y', 'd MMMM'), from an ISO timestamp or `YYYY-MM-DD`. */
export function formatCalendar(value: IsoDateString, pattern: string): string {
  // formatDate reads a bare `YYYY-MM-DD` as local midnight, which is the day before in UTC for
  // anyone east of Greenwich; pin it to UTC midnight like the stored dates.
  const utc = value.length === 10 ? `${value}T00:00:00.000Z` : value;
  return formatDate(utc, pattern, LOCALE, 'UTC');
}

/** Formats a point in time in the user's local time zone. */
export function formatLocal(value: Date | IsoDateString, pattern: string): string {
  return formatDate(value, pattern, LOCALE);
}

/**
 * Calendar date (meeting date, catch-up date) as "28 Dec 2026". The backend stores these as UTC
 * midnight, so they are shown in UTC; otherwise users west of Greenwich would see the day before.
 */
export function calendarDateText(value: IsoDateString): string {
  return formatCalendar(value, 'd MMM y');
}

@Pipe({ name: 'calendarDate' })
export class CalendarDatePipe implements PipeTransform {
  transform(value: IsoDateString | null | undefined): string {
    return value ? calendarDateText(value) : '';
  }
}

/** "2h ago", "3d ago" for recent points in time; the date after a week. */
export function relativeTime(value: IsoDateString, now = new Date()): string {
  const minutes = Math.round((now.getTime() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d ago` : formatLocal(value, 'd MMM');
}

/** A point in time (created, updated) in the user's local time zone. */
@Pipe({ name: 'timestamp' })
export class TimestampPipe implements PipeTransform {
  private readonly datePipe = inject(DatePipe);
  transform(value: IsoDateString | null | undefined): string {
    return value ? (this.datePipe.transform(value, 'd MMM y, HH:mm') ?? '') : '';
  }
}

export function fullName(person: PersonRef | null | undefined): string {
  return person ? [person.firstName, person.lastName].filter(Boolean).join(' ') : '';
}

@Pipe({ name: 'fullName' })
export class FullNamePipe implements PipeTransform {
  transform(person: PersonRef | null | undefined): string {
    return fullName(person);
  }
}

/** `yyyy-MM-dd` from an ISO string, for `<input type="date">` (no time zone shift). */
export function toDateInputValue(value: IsoDateString): string {
  return value.slice(0, 10);
}
