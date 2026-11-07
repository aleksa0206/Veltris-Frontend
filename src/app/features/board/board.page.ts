import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { Task, TASK_PRIORITIES, TaskPriority } from '../../core/api/models';
import { ProjectsApi, TasksApi } from '../../core/api/resources';
import { AuthService } from '../../core/auth/auth.service';
import { Changes } from '../../core/changes';
import { WorkspaceContext } from '../../core/workspace';
import { Editors } from '../../shared/editors';
import { Autofocus } from '../../shared/ui/autofocus';
import { Avatar } from '../../shared/ui/avatar';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { LoadError } from '../../shared/ui/feedback';
import { Crumb, Header } from '../../shared/ui/header';
import { Icon } from '../../shared/ui/icon';
import { PriorityIcon, StatusIcon } from '../../shared/ui/indicators';
import { Picker, PickerOption, PickerOptionTemplate } from '../../shared/ui/picker';
import { SidePanel } from '../../shared/ui/side-panel';
import { ToastService } from '../../shared/ui/toast';
import { Tooltip } from '../../shared/ui/tooltip';
import { todayIso } from '../../shared/util/dates';
import { calendarDateText, fullName } from '../../shared/util/format';
import { parseOption } from '../../shared/util/query';
import { percent, PRIORITY_LABELS, STATUS_LABELS } from '../../shared/util/task-text';
import { TaskDetailView } from '../tasks/task-detail';
import { BoardCard } from './board-card';
import {
  beforeTaskIdAt,
  BOARD_STATUSES,
  BoardFilter,
  BoardStatus,
  Columns,
  groupByStatus,
  matchesFilter,
} from './board-columns';

@Component({
  selector: 'app-board-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    Header,
    Icon,
    Autofocus,
    Avatar,
    Tooltip,
    LoadError,
    StatusIcon,
    PriorityIcon,
    Picker,
    PickerOptionTemplate,
    SidePanel,
    BoardCard,
    TaskDetailView,
  ],
  templateUrl: './board.page.html',
  styleUrl: './board.page.scss',
})
export default class BoardPage {
  // Route and query params.
  readonly projectId = input.required<string>();
  readonly task = input<string>();
  readonly q = input<string>();
  readonly assignee = input<string>();
  readonly priority = input<string>();

  private readonly projectsApi = inject(ProjectsApi);
  private readonly tasksApi = inject(TasksApi);
  private readonly changes = inject(Changes);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly auth = inject(AuthService);
  private readonly title = inject(Title);
  protected readonly workspace = inject(WorkspaceContext);
  protected readonly editors = inject(Editors);

  protected readonly statuses = BOARD_STATUSES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly calendarDate = calendarDateText;
  protected readonly percent = percent;

  protected readonly id = computed(() => Number(this.projectId()));
  protected readonly openTaskId = computed(() => Number(this.task()) || null);

  protected readonly project = rxResource({
    params: () => ({ id: this.id(), version: this.changes.projects() }),
    stream: ({ params: { id } }) => this.projectsApi.get(id, todayIso()),
  });

  private readonly tasks = rxResource({
    params: () => ({ id: this.id(), version: this.changes.tasks() }),
    stream: ({ params: { id } }) => this.tasksApi.board(id),
  });

  /** All cards per column; changed locally on drop, replaced by every reload. */
  private readonly columns = linkedSignal<Columns | null>(() => {
    const tasks = this.tasks.value();
    return tasks ? groupByStatus(tasks) : null;
  });

  protected readonly filter = computed<BoardFilter>(() => ({
    search: this.q() ?? '',
    assignee: this.assignee() ?? '',
    priority: parseOption(this.priority(), TASK_PRIORITIES) ?? '',
  }));
  protected readonly isFiltered = computed(() => {
    const f = this.filter();
    return !!(f.search || f.assignee || f.priority);
  });

  /** What each column shows under the current filter. */
  protected readonly visible = computed(() => {
    const columns = this.columns();
    if (!columns) return null;
    const filter = this.filter();
    const me = this.auth.user()?.id;
    return Object.fromEntries(
      BOARD_STATUSES.map((s) => [s, columns[s].filter((t) => matchesFilter(t, filter, me))]),
    ) as Columns;
  });

  protected readonly crumbs = computed<Crumb[]>(() => [
    { label: 'Projects', link: '/projects' },
    { label: this.project.value()?.name ?? '…' },
  ]);

  protected readonly assigneeOptions = computed<PickerOption<string>[]>(() => [
    { value: '', label: 'Anyone' },
    { value: 'me', label: 'Assigned to me' },
    { value: 'none', label: 'Unassigned' },
    ...this.workspace.members().map((m) => ({ value: String(m.id), label: fullName(m) })),
  ]);
  protected readonly priorityOptions: PickerOption<TaskPriority | ''>[] = [
    { value: '', label: 'Any priority' },
    ...TASK_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] })),
  ];

  protected readonly addingTo = signal<BoardStatus | null>(null);
  protected readonly projectProgress = computed(() => {
    const counts = this.project.value()?.tasks;
    return counts ? percent(counts.done, counts.total) : 0;
  });

  constructor() {
    // The document title follows the project name once it is known.
    effect(() => {
      const name = this.project.value()?.name;
      if (name) this.title.setTitle(`${name} · Veltris`);
    });
  }

  protected person(id: string) {
    return this.workspace.members().find((m) => String(m.id) === id) ?? null;
  }

  protected updateQuery(params: Record<string, string | null>): void {
    void this.router.navigate([], {
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected closePanel(): void {
    this.updateQuery({ task: null });
  }

  protected drop(event: CdkDragDrop<BoardStatus, BoardStatus, Task>): void {
    const columns = this.columns();
    const visible = this.visible();
    if (!columns || !visible) return;
    const task = event.item.data;
    const from = event.previousContainer.data;
    const to = event.container.data;
    if (from === to && event.previousIndex === event.currentIndex) return;

    // Where the card lands among the cards the user can see.
    const target = visible[to].filter((t) => t.id !== task.id);
    target.splice(event.currentIndex, 0, task);
    const beforeTaskId = beforeTaskIdAt(target, event.currentIndex);

    // Same placement in the full (unfiltered) column, so the board updates at once.
    const next = { ...columns, [from]: columns[from].filter((t) => t.id !== task.id) } as Columns;
    const destination = [...next[to]].filter((t) => t.id !== task.id);
    const at =
      beforeTaskId === null
        ? destination.length
        : destination.findIndex((t) => t.id === beforeTaskId);
    destination.splice(at, 0, { ...task, status: to });
    next[to] = destination;
    this.columns.set(next);

    this.tasksApi.move(task.id, to, beforeTaskId).subscribe({
      next: () => this.changes.notify('tasks', 'projects'),
      error: (err: unknown) => {
        this.toast.error(toApiError(err).message);
        this.tasks.reload();
      },
    });
  }

  protected quickAdd(status: BoardStatus, input: HTMLInputElement): void {
    const title = input.value.trim();
    if (!title) {
      this.addingTo.set(null);
      return;
    }
    input.disabled = true;
    this.tasksApi.create(this.id(), { title, status }).subscribe({
      next: () => {
        input.disabled = false;
        input.value = '';
        input.focus();
        this.changes.notify('tasks', 'projects');
      },
      error: (err: unknown) => {
        input.disabled = false;
        this.toast.error(toApiError(err).message);
      },
    });
  }

  protected async deleteProject(): Promise<void> {
    const project = this.project.value();
    if (!project) return;
    const confirmed = await this.confirm.confirm({
      title: `Delete ${project.name}?`,
      message: `All ${project.tasks.total} tasks of ${project.key}, with their comments and history, will be deleted for everyone. This cannot be undone.`,
      confirmLabel: 'Delete project',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.projectsApi.remove(project.id).subscribe({
      next: () => {
        this.toast.success(`${project.name} deleted.`);
        void this.router.navigateByUrl('/projects').then(() => this.changes.notify('projects'));
      },
      error: (err: unknown) => this.toast.error(toApiError(err).message),
    });
  }
}
