import {
  Activity,
  IsoDateString,
  PersonRef,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  WorkspaceRole,
} from '../../core/api/models';
import { daysBetween } from './dates';
import { formatCalendar, fullName } from './format';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  Backlog: 'Backlog',
  Todo: 'To do',
  InProgress: 'In progress',
  InReview: 'In review',
  Done: 'Done',
  Cancelled: 'Cancelled',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  Urgent: 'Urgent',
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
  None: 'No priority',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  Active: 'Active',
  OnHold: 'On hold',
  Completed: 'Completed',
  Archived: 'Archived',
};

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  Owner: 'Owner',
  Admin: 'Admin',
  Member: 'Member',
};

/** `WEB-12`. */
export function taskIdentifier(task: { number: number; project: { key: string } }): string {
  return `${task.project.key}-${task.number}`;
}

export function isOpen(status: TaskStatus): boolean {
  return status !== 'Done' && status !== 'Cancelled';
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'later';

export interface DueInfo {
  tone: DueTone;
  /** Short form for dense rows: "Today", "Tomorrow", "3d overdue", "12 Nov". */
  text: string;
}

/** How a due date reads relative to `today`; null when there is no date or the task is closed. */
export function dueInfo(
  dueDate: IsoDateString | null,
  today: string,
  status: TaskStatus = 'Todo',
): DueInfo | null {
  if (!dueDate || !isOpen(status)) return null;
  const days = daysBetween(today, dueDate.slice(0, 10));
  if (days < 0) return { tone: 'overdue', text: `${-days}d overdue` };
  if (days === 0) return { tone: 'today', text: 'Today' };
  if (days === 1) return { tone: 'soon', text: 'Tomorrow' };
  const sameYear = dueDate.slice(0, 4) === today.slice(0, 4);
  return {
    tone: days <= 6 ? 'soon' : 'later',
    text: formatCalendar(dueDate, sameYear ? 'd MMM' : 'd MMM y'),
  };
}

/** Share of work done as a whole percentage; 0 for an empty project. */
export function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

/**
 * One line of task history without the actor ("changed status from To do to Done").
 * `people` resolves assignee ids to names; ids no longer in the workspace read as a former member.
 */
export function activityText(activity: Activity, people: ReadonlyMap<number, PersonRef>): string {
  const { fromValue: from, toValue: to } = activity;
  const person = (id: string | null) =>
    id === null ? 'nobody' : fullName(people.get(Number(id))) || 'a former member';
  const day = (value: string | null) => (value ? formatCalendar(value, 'd MMM y') : 'none');
  switch (activity.type) {
    case 'Created':
      return 'created the task';
    case 'Commented':
      return 'commented';
    case 'TitleChanged':
      return `renamed the task from “${from}”`;
    case 'StatusChanged':
      return `changed status from ${STATUS_LABELS[from as TaskStatus]} to ${STATUS_LABELS[to as TaskStatus]}`;
    case 'PriorityChanged':
      return `set priority to ${PRIORITY_LABELS[to as TaskPriority]}`;
    case 'AssigneeChanged':
      return to === null ? `unassigned ${person(from)}` : `assigned ${person(to)}`;
    case 'DueDateChanged':
      return to === null ? 'removed the due date' : `set the due date to ${day(to)}`;
  }
}

/**
 * A project key suggested from its name: initials of a multi-word name ("Mobile app 2.0" → MA2),
 * the first three letters of a single word ("Website" → WEB). Matches the backend rule:
 * 2-10 letters or digits, starting with a letter.
 */
export function suggestProjectKey(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/[^A-Za-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const raw = words.length > 1 ? words.map((w) => w[0]).join('') : (words[0] ?? '').slice(0, 3);
  const key = raw
    .toUpperCase()
    .replace(/^[0-9]+/, '')
    .slice(0, 5);
  return key.length >= 2 ? key : '';
}
