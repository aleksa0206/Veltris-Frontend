import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, of } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { TaskDetail, TaskPriority, TaskStatus } from '../../core/api/models';
import { ProjectsApi, TasksApi } from '../../core/api/resources';
import { Changes } from '../../core/changes';
import { WorkspaceContext } from '../../core/workspace';
import { FieldControl, FormField } from '../../shared/ui/form-field';
import { AssigneePicker, PriorityPicker, StatusPicker } from '../../shared/ui/task-pickers';
import { applyServerErrors } from '../../shared/util/forms';

export interface TaskDialogData {
  /** Fixed project (board, project page); otherwise the user picks one. */
  projectId?: number;
  status?: TaskStatus;
}

@Component({
  selector: 'app-task-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FormField,
    FieldControl,
    StatusPicker,
    PriorityPicker,
    AssigneePicker,
  ],
  host: { class: 'dialog' },
  template: `
    <div class="dialog__header">
      <h2 class="dialog__title" id="task-dialog-title">New task</h2>
    </div>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="dialog__body form">
        @if (error(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }
        @if (!data.projectId) {
          <app-field label="Project">
            <select class="select project-select" appFieldControl formControlName="projectId">
              <option [ngValue]="null" disabled>Choose a project</option>
              @for (project of projects.value()?.data ?? []; track project.id) {
                <option [ngValue]="project.id">{{ project.key }} · {{ project.name }}</option>
              }
            </select>
          </app-field>
        }
        <app-field label="Title">
          <input
            class="input input--title"
            appFieldControl
            formControlName="title"
            placeholder="What needs to be done?"
          />
        </app-field>
        <app-field label="Description" [optional]="true">
          <textarea
            class="input"
            appFieldControl
            formControlName="description"
            rows="4"
            placeholder="Context, acceptance criteria, links…"
          ></textarea>
        </app-field>

        <div class="properties" role="group" aria-label="Properties">
          <app-status-picker
            appearance="button"
            [value]="status()"
            (valueChange)="status.set($event)"
          />
          <app-priority-picker
            appearance="button"
            [value]="priority()"
            (valueChange)="priority.set($event)"
          />
          <app-assignee-picker
            appearance="button"
            [people]="workspace.members()"
            [value]="assigneeId()"
            (valueChange)="assigneeId.set($event)"
          />
          <label class="due">
            <span class="visually-hidden">Due date</span>
            <input class="input" type="date" formControlName="dueDate" aria-label="Due date" />
          </label>
        </div>
      </div>
      <div class="dialog__actions">
        <button type="button" class="btn" (click)="ref.close()">Cancel</button>
        <button type="submit" class="btn btn--primary" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner" aria-hidden="true"></span>
          }
          Create task
        </button>
      </div>
    </form>
  `,
  styles: `
    .input--title {
      height: var(--control-height-lg);
      font-size: var(--font-size-body-lg);
      font-weight: var(--font-weight-medium);
    }
    .project-select {
      width: 100%;
    }
    .properties {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .due .input {
      width: 150px;
      height: var(--control-height-sm);
      font-size: var(--font-size-meta);
    }
  `,
})
export class TaskDialog {
  protected readonly ref = inject<DialogRef<TaskDetail>>(DialogRef);
  protected readonly data = inject<TaskDialogData>(DIALOG_DATA);
  protected readonly workspace = inject(WorkspaceContext);
  private readonly api = inject(TasksApi);
  private readonly projectsApi = inject(ProjectsApi);
  private readonly changes = inject(Changes);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal<TaskStatus>(this.data.status ?? 'Todo');
  protected readonly priority = signal<TaskPriority>('None');
  protected readonly assigneeId = signal<number | null>(null);

  protected readonly projects = rxResource({
    params: () => (this.data.projectId ? null : this.workspace.id()),
    stream: ({ params: id }) =>
      id
        ? this.projectsApi.list(id, { status: 'Active,OnHold', sort: 'name', limit: 100 })
        : of(null),
  });

  protected readonly form = inject(NonNullableFormBuilder).group({
    projectId: [this.data.projectId ?? (null as number | null), Validators.required],
    title: ['', [Validators.required, Validators.maxLength(191)]],
    description: [''],
    dueDate: [''],
  });

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.api
      .create(value.projectId!, {
        title: value.title.trim(),
        description: value.description.trim() || null,
        status: this.status(),
        priority: this.priority(),
        assigneeId: this.assigneeId(),
        dueDate: value.dueDate || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (task) => {
          this.changes.notify('tasks', 'projects');
          this.ref.close(task);
        },
        error: (err: unknown) => {
          const apiError = toApiError(err);
          if (!applyServerErrors(this.form, apiError)) this.error.set(apiError.message);
        },
      });
  }
}
