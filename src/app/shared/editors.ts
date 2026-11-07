import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Project, TaskDetail, Workspace } from '../core/api/models';
import type { TaskDialogData } from '../features/tasks/task-dialog';
import { FormDialogService } from './ui/dialogs';
import { ToastService } from './ui/toast';
import { taskIdentifier } from './util/task-text';

/**
 * Opens the create/edit dialogs from anywhere (sidebar, headers, command palette, empty states).
 * The dialogs save and report the change themselves; this only confirms and navigates.
 * Dialogs are imported on first use so form code stays out of the initial bundle.
 */
@Injectable({ providedIn: 'root' })
export class Editors {
  private readonly dialogs = inject(FormDialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  async project(project?: Project): Promise<Project | undefined> {
    const { ProjectDialog } = await import('../features/projects/project-dialog');
    const saved = await this.dialogs.open<Project, { project?: Project }>(
      ProjectDialog,
      { project },
      'project-dialog-title',
      '560px',
    );
    if (saved && !project) {
      this.toast.success(`Project ${saved.key} created.`);
      void this.router.navigate(['/projects', saved.id]);
    }
    return saved;
  }

  async task(data: TaskDialogData = {}): Promise<TaskDetail | undefined> {
    const { TaskDialog } = await import('../features/tasks/task-dialog');
    const saved = await this.dialogs.open<TaskDetail, TaskDialogData>(
      TaskDialog,
      data,
      'task-dialog-title',
      '600px',
    );
    if (saved) this.toast.success(`${taskIdentifier(saved)} created.`);
    return saved;
  }

  async workspace(): Promise<Workspace | undefined> {
    const { WorkspaceDialog } = await import('../features/workspace/workspace-dialog');
    const saved = await this.dialogs.open<Workspace, null>(
      WorkspaceDialog,
      null,
      'workspace-dialog-title',
    );
    if (saved) {
      this.toast.success(`Workspace “${saved.name}” created.`);
      void this.router.navigateByUrl('/');
    }
    return saved;
  }
}
