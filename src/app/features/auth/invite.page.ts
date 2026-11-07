import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize, of } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { InvitationsApi } from '../../core/api/resources';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceContext } from '../../core/workspace';
import { LoadError } from '../../shared/ui/feedback';
import { ToastService } from '../../shared/ui/toast';
import { fullName } from '../../shared/util/format';
import { ROLE_LABELS } from '../../shared/util/task-text';

/**
 * Landing page of an invitation link. Signed in with the invited address: join with one click.
 * Signed out: sign in (existing account) or create an account that joins this workspace.
 */
@Component({
  selector: 'app-invite-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoadError],
  template: `
    @if (preview.error(); as error) {
      <h1>Invitation not found</h1>
      <p class="text-secondary auth-lead">
        The link is incomplete or the invitation was revoked. Ask for a new one.
      </p>
      @if (!isMissing(error)) {
        <app-load-error [error]="error" (retry)="preview.reload()" />
      }
    } @else if (preview.value(); as invite) {
      <h1>Join {{ invite.workspace.name }}</h1>
      <p class="text-secondary auth-lead">
        {{ inviter() }} invited <strong>{{ invite.email }}</strong> as
        {{ roleLabels[invite.role].toLowerCase() }}.
      </p>

      @if (invite.status === 'expired') {
        <p class="form-error" role="alert">
          This invitation has expired. Ask {{ inviter() }} to send a new one.
        </p>
      } @else if (invite.status === 'accepted') {
        <p class="auth-notice" role="status">This invitation has already been used.</p>
        <a class="btn btn--primary auth-submit" routerLink="/">Go to Veltris</a>
      } @else if (auth.user(); as user) {
        @if (sameEmail(user.email, invite.email)) {
          @if (error(); as message) {
            <p class="form-error" role="alert">{{ message }}</p>
          }
          <button
            type="button"
            class="btn btn--primary auth-submit"
            [disabled]="joining()"
            (click)="join()"
          >
            Join {{ invite.workspace.name }}
          </button>
        } @else {
          <p class="form-error" role="alert">
            You are signed in as {{ user.email }}, but this invitation is for {{ invite.email }}.
            Sign out and continue with that address.
          </p>
          <button type="button" class="btn auth-submit" (click)="auth.logout()">Sign out</button>
        }
      } @else if (invite.hasAccount) {
        <a
          class="btn btn--primary auth-submit"
          routerLink="/login"
          [queryParams]="{ returnUrl: returnHere() }"
          >Sign in to accept</a
        >
      } @else {
        <a
          class="btn btn--primary auth-submit"
          routerLink="/register"
          [queryParams]="{ invite: token(), email: invite.email }"
          >Create your account</a
        >
        <p class="auth-footer">
          Already use Veltris with this address?
          <a routerLink="/login" [queryParams]="{ returnUrl: returnHere() }">Sign in</a>
        </p>
      }
    } @else {
      <span class="skeleton" style="width: 70%; height: 20px"></span>
      <span class="skeleton" style="width: 90%; margin-top: 16px"></span>
    }
  `,
  styleUrl: './auth-pages.scss',
})
export default class InvitePage {
  readonly token = input('');

  private readonly api = inject(InvitationsApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly workspace = inject(WorkspaceContext);
  protected readonly auth = inject(AuthService);

  protected readonly roleLabels = ROLE_LABELS;
  protected readonly joining = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly preview = rxResource({
    params: () => this.token(),
    stream: ({ params: token }) => (token ? this.api.preview(token) : of(null)),
  });

  protected readonly inviter = computed(() => fullName(this.preview.value()?.invitedBy));
  protected readonly returnHere = computed(() => `/invite?token=${this.token()}`);

  protected sameEmail(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }

  protected isMissing(error: unknown): boolean {
    return toApiError(error).kind === 'notFound';
  }

  protected join(): void {
    const user = this.auth.user();
    if (!user) return;
    this.joining.set(true);
    this.error.set(null);
    this.api
      .accept(this.token())
      .pipe(finalize(() => this.joining.set(false)))
      .subscribe({
        next: async ({ workspaceId }) => {
          // The shell's guard loads workspaces once per user; joining adds one.
          await this.workspace.load(user.id).catch(() => undefined);
          await this.workspace.reload(workspaceId);
          this.toast.success(`Welcome to ${this.preview.value()?.workspace.name}.`);
          void this.router.navigateByUrl('/');
        },
        error: (err: unknown) => this.error.set(toApiError(err).message),
      });
  }
}
