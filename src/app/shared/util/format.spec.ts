import { formatCalendar } from './format';

describe('formatCalendar', () => {
  it('shows the same day for a bare date and a stored UTC-midnight date', () => {
    expect(formatCalendar('2026-10-16', 'EEEE d MMM')).toBe('Friday 16 Oct');
    expect(formatCalendar('2026-10-16T00:00:00.000Z', 'EEEE d MMM')).toBe('Friday 16 Oct');
  });
});
