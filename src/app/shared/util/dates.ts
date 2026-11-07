// Due dates and project dates are calendar dates (`YYYY-MM-DD`, stored by the backend as UTC
// midnight), so all arithmetic here is done in UTC to stay independent of the user's time zone.

const DAY_MS = 24 * 60 * 60 * 1000;

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

/** Today's calendar date in the user's time zone, as `YYYY-MM-DD`. */
export function todayIso(now = new Date()): string {
  return isoDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function addDays(value: string, days: number): string {
  return isoDate(new Date(parseIsoDate(value).getTime() + days * DAY_MS));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / DAY_MS);
}
