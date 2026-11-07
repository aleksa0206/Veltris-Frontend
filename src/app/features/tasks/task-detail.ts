import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { TaskDetail } from '../../core/api/models';
import { TaskInput, TasksApi } from '../../core/api/resources';
import { Changes } from '../../core/changes';
import { WorkspaceContext } from '../../core/workspace';
import { Avatar } from '../../shared/ui/avatar';
import { LoadError } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { StatusIcon } from '../../shared/ui/indicators';
import { AssigneePicker, PriorityPicker, StatusPicker } from '../../shared/ui/task-pickers';
import { ToastService } from '../../shared/ui/toast';
import { todayIso } from '../../shared/util/dates';
import { calendarDateText, FullNamePipe, TimestampPipe } from '../../shared/util/format';
import { dueInfo, taskIdentifier } from '../../shared/util/task-text';
import { TaskTimeline } from './task-timeline';

/**
 * Everything about one task, editable in place. Used full-width on the task page (`page`:
 * content column + property rail) and inside the board's side panel (`panel`: one column,
 * properties under the title).
 */
@Component({
  selector: 'app-task-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    RouterLink,
    Avatar,
    Icon,
    LoadError,
    StatusIcon,
    StatusPicker,
    PriorityPicker,
    AssigneePicker,
    FullNamePipe,
    TimestampPipe,
    TaskTimeline,
  ],
  host: { '[class]': '"detail detail--" + variant()' },
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.scss',
})
export class TaskDetailView {
  readonly taskId = input.required<number>();
  readonly variant = input<'page' | 'panel'>('page');
  /** The task as loaded, for the host's header (breadcrumbs, title). */
  readonly loaded = output<TaskDetail>();

  private readonly api = inject(TasksApi);
  private readonly changes = inject(Changes);
  private readonly toast = inject(ToastService);
  protected readonly workspace = inject(WorkspaceContext);

  protected readonly resource = rxResource({
    params: () => ({ id: this.taskId(), version: this.changes.tasks() }),
    stream: ({ params: { id } }) => this.api.get(id),
  });

  /** Local copy, so edits show immediately and survive until the reload arrives. */
  protected readonly task = linkedSignal(() => this.resource.value());
  protected readonly saving = signal(false);
  protected readonly newSubtask = signal('');

  protected readonly identifier = computed(() => {
    const task = this.task();
    return task ? taskIdentifier(task) : '';
  });
  protected readonly due = computed(() => {
    const task = this.task();
    return task ? dueInfo(task.dueDate, todayIso(), task.status) : null;
  });
  protected readonly subtasksDone = computed(
    () => this.task()?.subtasks.filter((s) => s.status === 'Done').length ?? 0,
  );
  protected readonly calendarDate = calendarDateText;

  constructor() {
    // Reports each loaded version to the host (breadcrumbs, document title).
    effect(() => {
      const task = this.resource.value();
      if (task) this.loaded.emit(task);
    });
  }

  /** Saves one or more properties; the UI updates first and rolls back if the save fails. */
  protected save(changes: Partial<TaskInput>): void {
    const before = this.task();
    if (!before) return;
    this.task.set({ ...before, ...this.optimistic(changes) });
    this.run(this.api.update(before.id, changes), () => this.task.set(before));
  }

  /** A blank title is not saved; the box goes back to the current one. */
  protected saveTitle(box: HTMLTextAreaElement): void {
    const title = box.value.trim();
    const task = this.task();
    if (!task || title === task.title) return;
    if (!title) {
      box.value = task.title;
      return;
    }
    this.save({ title });
  }

  protected saveDescription(value: string): void {
    const description = value.trim() || null;
    if (description !== (this.task()?.description ?? null)) this.save({ description });
  }

  protected toggleSubtask(subtask: TaskDetail['subtasks'][number]): void {
    const status = subtask.status === 'Done' ? 'Todo' : 'Done';
    this.run(this.api.update(subtask.id, { status }));
  }

  protected addSubtask(): void {
    const task = this.task();
    const title = this.newSubtask().trim();
    if (!task || !title) return;
    this.run(
      this.api.create(task.project.id, { title, parentId: task.id }),
      () => undefined,
      () => this.newSubtask.set(''),
    );
  }

  protected person(id: number | null) {
    return this.workspace.members().find((m) => m.id === id) ?? null;
  }

  private optimistic(changes: Partial<TaskInput>): Partial<TaskDetail> {
    const { assigneeId, ...rest } = changes;
    return {
      ...rest,
      ...(assigneeId !== undefined ? { assignee: this.person(assigneeId) } : {}),
    } as Partial<TaskDetail>;
  }

  private run(
    request: Observable<unknown>,
    rollback: () => void = () => undefined,
    done: () => void = () => undefined,
  ): void {
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        done();
        this.changes.notify('tasks', 'projects');
      },
      error: (err: unknown) => {
        rollback();
        this.toast.error(toApiError(err).message);
      },
    });
  }
}
