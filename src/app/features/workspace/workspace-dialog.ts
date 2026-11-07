import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { Workspace } from '../../core/api/models';
import { WorkspacesApi } from '../../core/api/resources';
import { WorkspaceContext } from '../../core/workspace';
import { FieldControl, FormField } from '../../shared/ui/form-field';

@Component({
  selector: 'app-workspace-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormField, FieldControl],
  host: { class: 'dialog' },
  template: `
    <div class="dialog__header">
      <h2 class="dialog__title" id="workspace-dialog-title">New workspace</h2>
    </div>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="dialog__body form">
        <p class="text-secondary">
          A separate space with its own projects and members. You will be its owner.
        </p>
        @if (error(); as message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }
        <app-field label="Name">
          <input class="input" appFieldControl formControlName="name" placeholder="Acme Inc." />
        </app-field>
      </div>
      <div class="dialog__actions">
        <button type="button" class="btn" (click)="ref.close()">Cancel</button>
        <button type="submit" class="btn btn--primary" [disabled]="saving()">
          Create workspace
        </button>
      </div>
    </form>
  `,
})
export class WorkspaceDialog {
  protected readonly ref = inject<DialogRef<Workspace>>(DialogRef);
  private readonly api = inject(WorkspacesApi);
  private readonly context = inject(WorkspaceContext);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.api
      .create(this.form.getRawValue().name.trim())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: async (workspace) => {
          await this.context.reload(workspace.id);
          this.ref.close(workspace);
        },
        error: (err: unknown) => this.error.set(toApiError(err).message),
      });
  }
}
