import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, Observable, of } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { Member } from '../../core/api/models';
import { AssignableRole, WorkspacesApi } from '../../core/api/resources';
import { AuthService } from '../../core/auth/auth.service';
import { Changes } from '../../core/changes';
import { WorkspaceContext } from '../../core/workspace';
import { Avatar } from '../../shared/ui/avatar';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError } from '../../shared/ui/feedback';
import { FieldControl, FormField } from '../../shared/ui/form-field';
import { Crumb, Header } from '../../shared/ui/header';
import { Icon } from '../../shared/ui/icon';
import { Picker, PickerOption } from '../../shared/ui/picker';
import { ToastService } from '../../shared/ui/toast';
import { CalendarDatePipe, fullName, FullNamePipe } from '../../shared/util/format';
import { applyServerErrors } from '../../shared/util/forms';
import { ROLE_LABELS } from '../../shared/util/task-text';

const ROLE_OPTIONS: PickerOption<AssignableRole>[] = [
  { value: 'Member', label: ROLE_LABELS.Member },
  { value: 'Admin', label: ROLE_LABELS.Admin },
];

const ROLE_HINTS: Record<Member['role'], string> = {
  Owner: 'Created the workspace; cannot be removed.',
  Admin: 'Manages members, invitations and projects.',
  Member: 'Works on projects and tasks.',
};

@Component({
  selector: 'app-members-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    Header,
    Icon,
    Avatar,
    Picker,
    FormField,
    FieldControl,
    EmptyState,
    LoadError,
    FullNamePipe,
    CalendarDatePipe,
  ],
  templateUrl: './members.page.html',
  styleUrl: './members.page.scss',
})
export default class MembersPage {
  private readonly api = inject(WorkspacesApi);
  private readonly changes = inject(Changes);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly workspace = inject(WorkspaceContext);

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly roleHints = ROLE_HINTS;

  protected readonly crumbs = computed<Crumb[]>(() => [
    { label: this.workspace.current()?.name ?? 'Workspace', link: '/' },
    { label: 'Members' },
  ]);

  /** Members come from the workspace context, which the pickers elsewhere share. */
  protected readonly details = this.workspace.details;

  private readonly invitationsVersion = signal(0);
  protected readonly invitations = rxResource({
    params: () => ({
      id: this.workspace.canManage() ? this.workspace.id() : null,
      version: this.invitationsVersion(),
    }),
    stream: ({ params: { id } }) => (id ? this.api.invitations(id) : of(null)),
  });

  protected readonly inviting = signal(false);
  protected readonly inviteError = signal<string | null>(null);
  protected readonly inviteForm = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(191)]],
    role: ['Member' as AssignableRole],
  });

  protected isMe(member: Member): boolean {
    return member.id === this.auth.user()?.id;
  }

  protected invite(): void {
    const id = this.workspace.id();
    this.inviteError.set(null);
    if (!id || this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }
    const body = this.inviteForm.getRawValue();
    this.inviting.set(true);
    this.api
      .invite(id, { email: body.email.trim(), role: body.role })
      .pipe(finalize(() => this.inviting.set(false)))
      .subscribe({
        next: ({ outcome }) => {
          this.toast.success(
            outcome === 'added'
              ? `${body.email} already had an account and is now a member.`
              : `Invitation sent to ${body.email}.`,
          );
          this.inviteForm.reset({ email: '', role: body.role });
          this.changes.notify('workspace');
          this.invitationsVersion.update((v) => v + 1);
        },
        error: (err: unknown) => {
          const apiError = toApiError(err);
          if (!applyServerErrors(this.inviteForm, apiError)) this.inviteError.set(apiError.message);
        },
      });
  }

  protected changeRole(member: Member, role: AssignableRole): void {
    const id = this.workspace.id();
    if (!id || role === member.role) return;
    this.run(
      this.api.changeRole(id, member.id, role),
      `${fullName(member)} is now ${ROLE_LABELS[role].toLowerCase()}.`,
    );
  }

  protected async remove(member: Member): Promise<void> {
    const id = this.workspace.id();
    const leaving = this.isMe(member);
    if (!id) return;
    const confirmed = await this.confirm.confirm(
      leaving
        ? {
            title: `Leave ${this.workspace.current()?.name}?`,
            message:
              'You will lose access to its projects and tasks. Your open tasks become unassigned. Someone will have to invite you again to come back.',
            confirmLabel: 'Leave workspace',
            tone: 'danger',
          }
        : {
            title: `Remove ${fullName(member)}?`,
            message:
              'They lose access to this workspace. Their open tasks become unassigned and they stop leading projects.',
            confirmLabel: 'Remove member',
            tone: 'danger',
          },
    );
    if (!confirmed) return;

    this.api.removeMember(id, member.id).subscribe({
      next: async ({ unassignedTasks }) => {
        if (leaving) {
          await this.workspace.reload();
          this.toast.success('You left the workspace.');
          void this.router.navigateByUrl('/');
          return;
        }
        const tasks = unassignedTasks === 1 ? '1 task' : `${unassignedTasks} tasks`;
        this.toast.success(
          unassignedTasks
            ? `${fullName(member)} removed; ${tasks} unassigned.`
            : `${fullName(member)} removed.`,
        );
        this.changes.notify('workspace', 'tasks', 'projects');
      },
      error: (err: unknown) => this.toast.error(toApiError(err).message),
    });
  }

  protected revoke(invitationId: number, email: string): void {
    const id = this.workspace.id();
    if (!id) return;
    this.api.revokeInvitation(id, invitationId).subscribe({
      next: () => {
        this.toast.success(`Invitation for ${email} revoked.`);
        this.invitationsVersion.update((v) => v + 1);
      },
      error: (err: unknown) => this.toast.error(toApiError(err).message),
    });
  }

  private run(request: Observable<unknown>, success: string): void {
    request.subscribe({
      next: () => {
        this.toast.success(success);
        this.changes.notify('workspace');
      },
      error: (err: unknown) => this.toast.error(toApiError(err).message),
    });
  }
}
