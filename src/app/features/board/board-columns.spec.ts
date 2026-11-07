import { Task } from '../../core/api/models';
import { beforeTaskIdAt, groupByStatus, matchesFilter } from './board-columns';

function task(id: number, overrides: Partial<Task> = {}): Task {
  return {
    id,
    number: id,
    title: `Task ${id}`,
    status: 'Todo',
    priority: 'None',
    assignee: null,
    project: { id: 1, key: 'WEB', name: 'Web' },
    ...overrides,
  } as Task;
}

describe('board columns', () => {
  it('groups cards by status in server order and leaves cancelled tasks off the board', () => {
    const columns = groupByStatus([
      task(1),
      task(2, { status: 'Done' }),
      task(3),
      task(4, { status: 'Cancelled' }),
    ]);
    expect(columns.Todo.map((t) => t.id)).toEqual([1, 3]);
    expect(columns.Done.map((t) => t.id)).toEqual([2]);
    expect(Object.values(columns).flat()).toHaveLength(3);
  });

  it('a dropped card goes above its new next neighbour, or to the bottom', () => {
    const column = [task(1), task(2), task(3)];
    expect(beforeTaskIdAt(column, 0)).toBe(2);
    expect(beforeTaskIdAt(column, 2)).toBeNull();
  });

  it('filters by title or identifier, priority and assignee', () => {
    const ana = { id: 7, firstName: 'Ana', lastName: null };
    const mine = task(12, { title: 'Pricing page', priority: 'High', assignee: ana });
    const none = { search: '', assignee: '', priority: '' } as const;

    expect(matchesFilter(mine, { ...none, search: 'pricing' }, 7)).toBe(true);
    expect(matchesFilter(mine, { ...none, search: 'web-12' }, 7)).toBe(true);
    expect(matchesFilter(mine, { ...none, search: 'footer' }, 7)).toBe(false);
    expect(matchesFilter(mine, { ...none, priority: 'Low' }, 7)).toBe(false);
    expect(matchesFilter(mine, { ...none, assignee: 'me' }, 7)).toBe(true);
    expect(matchesFilter(mine, { ...none, assignee: 'none' }, 7)).toBe(false);
    expect(matchesFilter(task(1), { ...none, assignee: 'none' }, 7)).toBe(true);
    expect(matchesFilter(mine, { ...none, assignee: '7' }, 1)).toBe(true);
  });
});
