import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { Project, PROJECT_STATUSES, ProjectStatus } from '../../core/api/models';
import { ProjectInput, ProjectsApi } from '../../core/api/resources';
import { Changes } from '../../core/changes';
import { WorkspaceContext } from '../../core/workspace';
import { FieldControl, FormField } from '../../shared/ui/form-field';
import { AssigneePicker } from '../../shared/ui/task-pickers';
import { toDateInputValue } from '../../shared/util/format';
import { applyServerErrors } from '../../shared/util/forms';
import { PROJECT_STATUS_LABELS, suggestProjectKey } from '../../shared/util/task-text';

@Component({
  selector: 'app-project-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormField, FieldControl, AssigneePicker],
  host: { class: 'dialog' },
  template: `
    <div class="dialog__header">
      <h2 class="dialog__title" id="project-dialog-title">
        {{ project ? 'Edit project' : 'New project' }}
      </h2>
    </div>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="dialog__body form">
        @if (error(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }
        <div class="name-row">
          <app-field label="Name">
            <input class="input" appFieldControl formControlName="name" (input)="nameChanged()" />
          </app-field>
          <app-field label="Key" hint="Prefix of task IDs.">
            <input
              class="input mono key-input"
              appFieldControl
              formControlName="key"
              maxlength="10"
              (input)="keyEdited = true"
            />
          </app-field>
        </div>
        <app-field label="Description" [optional]="true">
          <textarea class="input" appFieldControl formControlName="description" rows="3"></textarea>
        </app-field>
        <div class="form__row">
          <app-field label="Status">
            <select class="select" appFieldControl formControlName="status">
              @for (status of statuses; track status) {
                <option [value]="status">{{ statusLabels[status] }}</option>
              }
            </select>
          </app-field>
          <div class="field-like">
            <span class="field-like__label">Lead</span>
            <app-assignee-picker
              label="Lead"
              emptyLabel="No lead"
              appearance="button"
              [people]="workspace.members()"
              [value]="lead()"
              (valueChange)="lead.set($event); form.markAsDirty()"
            />
          </div>
        </div>
        <div class="form__row">
          <app-field label="Start date" [optional]="true">
            <input class="input" type="date" appFieldControl formControlName="startDate" />
          </app-field>
          <app-field label="Target date" [optional]="true">
            <input class="input" type="date" appFieldControl formControlName="targetDate" />
          </app-field>
        </div>
      </div>
      <div class="dialog__actions">
        <button type="button" class="btn" (click)="ref.close()">Cancel</button>
        <button type="submit" class="btn btn--primary" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner" aria-hidden="true"></span>
          }
          {{ project ? 'Save changes' : 'Create project' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .name-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 120px;
      gap: var(--space-3);
    }
    .key-input {
      text-transform: uppercase;
    }
    .field-like {
      display: grid;
      align-content: start;
      gap: var(--space-1-5);
    }
    .field-like__label {
      font-size: var(--font-size-meta);
      line-height: var(--line-height-meta);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
    }
    .field-like app-assignee-picker {
      height: var(--control-height);
    }
  `,
})
export class ProjectDialog {
  protected readonly ref = inject<DialogRef<Project>>(DialogRef);
  protected readonly project = inject<{ project?: Project }>(DIALOG_DATA).project;
  protected readonly workspace = inject(WorkspaceContext);
  private readonly api = inject(ProjectsApi);
  private readonly changes = inject(Changes);

  protected readonly statuses = PROJECT_STATUSES;
  protected readonly statusLabels = PROJECT_STATUS_LABELS;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly lead = signal<number | null>(this.project?.lead?.id ?? null);
  protected keyEdited = !!this.project;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.project?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    key: [
      this.project?.key ?? '',
      [Validators.required, Validators.pattern(/^[A-Za-z][A-Za-z0-9]{1,9}$/)],
    ],
    description: [this.project?.description ?? ''],
    status: [this.project?.status ?? ('Active' as ProjectStatus)],
    startDate: [this.project?.startDate ? toDateInputValue(this.project.startDate) : ''],
    targetDate: [this.project?.targetDate ? toDateInputValue(this.project.targetDate) : ''],
  });

  /** The key follows the name until the user types a key of their own. */
  protected nameChanged(): void {
    if (!this.keyEdited) {
      this.form.controls.key.setValue(suggestProjectKey(this.form.controls.name.value));
    }
  }

  protected submit(): void {
    this.error.set(null);
    const value = this.form.getRawValue();
    if (value.startDate && value.targetDate && value.targetDate < value.startDate) {
      this.form.controls.targetDate.setErrors({ order: 'Must not be before the start date.' });
      this.form.controls.targetDate.markAsTouched();
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const workspaceId = this.workspace.id();
    if (!workspaceId) return;

    const body: ProjectInput = {
      key: value.key.toUpperCase(),
      name: value.name.trim(),
      description: value.description.trim() || null,
      status: value.status,
      leadId: this.lead(),
      startDate: value.startDate || null,
      targetDate: value.targetDate || null,
    };
    const request = this.project
      ? this.api.update(this.project.id, body)
      : this.api.create(workspaceId, body);

    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.changes.notify('projects');
        this.ref.close(saved);
      },
      error: (err: unknown) => {
        const apiError = toApiError(err);
        if (!applyServerErrors(this.form, apiError)) this.error.set(apiError.message);
      },
    });
  }
}
