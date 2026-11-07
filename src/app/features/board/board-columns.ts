import { Task, TaskPriority, TaskStatus } from '../../core/api/models';
import { taskIdentifier } from '../../shared/util/task-text';

/** Board columns, left to right. Cancelled tasks leave the board; the status menu reaches them. */
export const BOARD_STATUSES = ['Backlog', 'Todo', 'InProgress', 'InReview', 'Done'] as const;
export type BoardStatus = (typeof BOARD_STATUSES)[number];

export type Columns = Record<BoardStatus, Task[]>;

/** Cards per column, keeping the server's order (status, then position). */
export function groupByStatus(tasks: Task[]): Columns {
  const columns = Object.fromEntries(BOARD_STATUSES.map((s) => [s, [] as Task[]])) as Columns;
  for (const task of tasks) {
    if (task.status !== 'Cancelled') columns[task.status].push(task);
  }
  return columns;
}

export interface BoardFilter {
  search: string;
  /** `me`, `none`, a user id as text, or empty for anyone. */
  assignee: string;
  priority: TaskPriority | '';
}

export function matchesFilter(task: Task, filter: BoardFilter, meId: number | undefined): boolean {
  const search = filter.search.trim().toLowerCase();
  if (
    search &&
    !task.title.toLowerCase().includes(search) &&
    !taskIdentifier(task).toLowerCase().includes(search)
  ) {
    return false;
  }
  if (filter.priority && task.priority !== filter.priority) return false;
  switch (filter.assignee) {
    case '':
      return true;
    case 'none':
      return task.assignee === null;
    case 'me':
      return task.assignee?.id === meId;
    default:
      return task.assignee?.id === Number(filter.assignee);
  }
}

/**
 * After a drop the card sits at `index` of `column`; the server places it above the card that
 * now follows it (null = bottom of the column).
 */
export function beforeTaskIdAt(column: Task[], index: number): number | null {
  return column[index + 1]?.id ?? null;
}

export function isBoardStatus(status: TaskStatus): status is BoardStatus {
  return (BOARD_STATUSES as readonly TaskStatus[]).includes(status);
}
