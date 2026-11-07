import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { TaskDetail } from '../../core/api/models';
import { TasksApi } from '../../core/api/resources';
import { AuthService } from '../../core/auth/auth.service';
import { Changes } from '../../core/changes';
import { WorkspaceContext } from '../../core/workspace';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { Crumb, Header } from '../../shared/ui/header';
import { Icon } from '../../shared/ui/icon';
import { ToastService } from '../../shared/ui/toast';
import { Tooltip } from '../../shared/ui/tooltip';
import { taskIdentifier } from '../../shared/util/task-text';
import { TaskDetailView } from './task-detail';

@Component({
  selector: 'app-task-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Header, Icon, Tooltip, CdkMenu, CdkMenuItem, CdkMenuTrigger, TaskDetailView],
  template: `
    <div class="page">
      <app-header [crumbs]="crumbs()">
        <button
          type="button"
          class="btn btn--ghost btn--icon"
          aria-label="Copy link to this task"
          appTooltip="Copy link"
          (click)="copyLink()"
        >
          <app-icon name="link" />
        </button>
        @if (canDelete()) {
          <button
            type="button"
            class="btn btn--ghost btn--icon"
            aria-label="More actions"
            [cdkMenuTriggerFor]="more"
          >
            <app-icon name="more" />
          </button>
        }
      </app-header>
      <app-task-detail class="page__fill" [taskId]="id()" (loaded)="onLoaded($event)" />
    </div>

    <ng-template #more>
      <div class="menu" cdkMenu>
        <button
          type="button"
          class="menu__item menu__item--danger"
          cdkMenuItem
          (cdkMenuItemTriggered)="remove()"
        >
          <app-icon name="trash" /> Delete task
        </button>
      </div>
    </ng-template>
  `,
  styles: `
    .page__fill {
      flex: 1;
      min-height: 0;
    }
  `,
})
export default class TaskPage {
  readonly taskId = input.required<string>();

  private readonly api = inject(TasksApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly changes = inject(Changes);
  private readonly title = inject(Title);
  private readonly auth = inject(AuthService);
  private readonly workspace = inject(WorkspaceContext);

  protected readonly id = computed(() => Number(this.taskId()));
  private readonly task = signal<TaskDetail | null>(null);

  protected readonly crumbs = computed<Crumb[]>(() => {
    const task = this.task();
    if (!task) return [{ label: 'Projects', link: '/projects' }, { label: '…' }];
    return [
      { label: 'Projects', link: '/projects' },
      { label: task.project.name, link: ['/projects', task.project.id] },
      ...(task.parent
        ? [
            {
              label: `${task.project.key}-${task.parent.number}`,
              link: ['/tasks', task.parent.id],
              mono: true,
            },
          ]
        : []),
      { label: taskIdentifier(task), mono: true },
    ];
  });

  // Mirrors the backend rule; the server still decides.
  protected readonly canDelete = computed(
    () => this.task()?.reporter.id === this.auth.user()?.id || this.workspace.canManage(),
  );

  protected onLoaded(task: TaskDetail): void {
    this.task.set(task);
    this.title.setTitle(`${taskIdentifier(task)} ${task.title} · Veltris`);
  }

  protected copyLink(): void {
    navigator.clipboard.writeText(location.href).then(
      () => this.toast.success('Link copied.'),
      () => this.toast.error('The link could not be copied.'),
    );
  }

  protected async remove(): Promise<void> {
    const task = this.task();
    if (!task) return;
    const confirmed = await this.confirm.confirm({
      title: `Delete ${taskIdentifier(task)}?`,
      message: 'The task, its subtasks, comments and history will be deleted for everyone.',
      confirmLabel: 'Delete task',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.remove(task.id).subscribe({
      next: () => {
        this.toast.success(`${taskIdentifier(task)} deleted.`);
        // Leave first, so this page does not reload a task that no longer exists.
        void this.router
          .navigate(['/projects', task.project.id])
          .then(() => this.changes.notify('tasks', 'projects'));
      },
      error: (err: unknown) => this.toast.error(toApiError(err).message),
    });
  }
}
