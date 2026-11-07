import { Activity } from '../../core/api/models';
import { activityText, dueInfo, percent, suggestProjectKey, taskIdentifier } from './task-text';

const today = '2026-11-07';

describe('dueInfo', () => {
  it('reads overdue, today, tomorrow and later dates relative to the user’s today', () => {
    expect(dueInfo('2026-11-04T00:00:00.000Z', today)).toEqual({
      tone: 'overdue',
      text: '3d overdue',
    });
    expect(dueInfo('2026-11-07', today)).toEqual({ tone: 'today', text: 'Today' });
    expect(dueInfo('2026-11-08', today)).toEqual({ tone: 'soon', text: 'Tomorrow' });
    expect(dueInfo('2026-11-12', today)?.tone).toBe('soon');
    expect(dueInfo('2026-12-24', today)).toEqual({ tone: 'later', text: '24 Dec' });
    expect(dueInfo('2027-01-05', today)?.text).toBe('5 Jan 2027');
  });

  it('says nothing for closed tasks or tasks without a date', () => {
    expect(dueInfo('2026-11-01', today, 'Done')).toBeNull();
    expect(dueInfo('2026-11-01', today, 'Cancelled')).toBeNull();
    expect(dueInfo(null, today)).toBeNull();
  });
});

describe('activityText', () => {
  const people = new Map([[7, { id: 7, firstName: 'Marko', lastName: 'Jovanović' }]]);
  const entry = (type: Activity['type'], fromValue: string | null, toValue: string | null) =>
    ({ type, fromValue, toValue }) as Activity;

  it('renders raw history values as sentences', () => {
    expect(activityText(entry('StatusChanged', 'Todo', 'InProgress'), people)).toBe(
      'changed status from To do to In progress',
    );
    expect(activityText(entry('AssigneeChanged', null, '7'), people)).toBe(
      'assigned Marko Jovanović',
    );
    expect(activityText(entry('AssigneeChanged', '9', null), people)).toBe(
      'unassigned a former member',
    );
    expect(activityText(entry('DueDateChanged', null, '2026-11-20'), people)).toBe(
      'set the due date to 20 Nov 2026',
    );
  });
});

describe('small helpers', () => {
  it('builds identifiers and percentages', () => {
    expect(taskIdentifier({ number: 12, project: { key: 'WEB' } })).toBe('WEB-12');
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });
});

describe('suggestProjectKey', () => {
  it('uses initials for several words and three letters for one', () => {
    expect(suggestProjectKey('Website')).toBe('WEB');
    expect(suggestProjectKey('Mobile app 2.0')).toBe('MA2');
    expect(suggestProjectKey('Infrastructure migration')).toBe('IM');
    expect(suggestProjectKey('Čišćenje')).toBe('CIS');
  });

  it('suggests nothing when no valid key can be built', () => {
    expect(suggestProjectKey('X')).toBe('');
    expect(suggestProjectKey('2024')).toBe('');
  });
});
