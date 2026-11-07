// Backend API contracts (Veltris-Backend, prisma/schema.prisma + repositories).
// Calendar dates arrive as ISO strings at UTC midnight.

export type IsoDateString = string;

export const WORKSPACE_ROLES = ['Owner', 'Admin', 'Member'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const PROJECT_STATUSES = ['Active', 'OnHold', 'Completed', 'Archived'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** In board order. Cancelled has no column; it is reached through the status menu. */
export const TASK_STATUSES = [
  'Backlog',
  'Todo',
  'InProgress',
  'InReview',
  'Done',
  'Cancelled',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Most urgent first, as menus list them. */
export const TASK_PRIORITIES = ['Urgent', 'High', 'Medium', 'Low', 'None'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type ActivityType =
  | 'Created'
  | 'TitleChanged'
  | 'StatusChanged'
  | 'PriorityChanged'
  | 'AssigneeChanged'
  | 'DueDateChanged'
  | 'Commented';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paged<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PersonRef {
  id: number;
  firstName: string;
  lastName: string | null;
}

export interface User extends PersonRef {
  lastName: string;
  email: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CurrentUser extends User {
  twoFactorEnabled: boolean;
}

export interface Member extends PersonRef {
  email: string;
  role: WorkspaceRole;
}

export interface WorkspaceSummary {
  id: number;
  name: string;
  role: WorkspaceRole;
  memberCount: number;
}

export interface Workspace {
  id: number;
  name: string;
  role: WorkspaceRole;
  members: Member[];
}

export interface TaskCounts {
  total: number;
  done: number;
  open: number;
  overdue: number;
}

export interface Project {
  id: number;
  workspaceId: number;
  key: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  lead: PersonRef | null;
  startDate: IsoDateString | null;
  targetDate: IsoDateString | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface ProjectWithCounts extends Project {
  tasks: TaskCounts;
}

export interface ProjectRef {
  id: number;
  key: string;
  name: string;
}

interface TaskFields {
  id: number;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: PersonRef | null;
  dueDate: IsoDateString | null;
  position: number;
  parentId: number | null;
  completedAt: IsoDateString | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

/** A task in a list or on the board. */
export interface Task extends TaskFields {
  project: ProjectRef;
  subtaskCount: number;
  subtasksDone: number;
  commentCount: number;
}

export interface TaskDetail extends TaskFields {
  project: ProjectRef & { workspaceId: number };
  reporter: PersonRef;
  parent: { id: number; number: number; title: string } | null;
  subtasks: TaskFields[];
}

export interface Comment {
  id: number;
  taskId: number;
  author: PersonRef;
  body: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface Activity {
  id: number;
  taskId: number;
  type: ActivityType;
  actor: PersonRef;
  /** Raw values: enum names, user ids, `YYYY-MM-DD` or titles. */
  fromValue: string | null;
  toValue: string | null;
  createdAt: IsoDateString;
}

export interface WorkspaceActivity extends Activity {
  task: { id: number; number: number; title: string; project: { id: number; key: string } };
}

export interface Overview {
  /** Open tasks assigned to the caller, soonest due first. */
  myTasks: Task[];
  myTasksTotal: number;
  /** Active and on-hold projects, nearest target date first. */
  projects: ProjectWithCounts[];
  projectsTotal: number;
  activity: WorkspaceActivity[];
  stats: { open: number; overdue: number; dueThisWeek: number; completedThisWeek: number };
}
