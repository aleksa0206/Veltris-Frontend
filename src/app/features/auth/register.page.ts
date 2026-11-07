import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { FieldControl, FormField } from '../../shared/ui/form-field';
import { applyServerErrors } from '../../shared/util/forms';

/**
 * Sign-up. From an invitation link (`?invite=<token>&email=`) the account joins the invited
 * workspace, so there is no workspace name to choose and the email is the invited one.
 */
@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FormField, FieldControl],
  template: `
    <h1>{{ invite() ? 'Create your account to join' : 'Create your account' }}</h1>
    <p class="text-secondary auth-lead">
      @if (invite()) {
        You will join the workspace you were invited to.
      } @else {
        Your account comes with a workspace for your team’s projects.
      }
    </p>

    @if (error(); as message) {
      <p class="form-error" role="alert">{{ message }}</p>
    }

    <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="form__row">
        <app-field label="First name">
          <input
            class="input"
            appFieldControl
            formControlName="firstName"
            autocomplete="given-name"
          />
        </app-field>
        <app-field label="Last name">
          <input
            class="input"
            appFieldControl
            formControlName="lastName"
            autocomplete="family-name"
          />
        </app-field>
      </div>
      <app-field label="Email" [hint]="invite() ? 'The address the invitation was sent to.' : ''">
        <input
          class="input"
          appFieldControl
          type="email"
          formControlName="email"
          autocomplete="email"
          [readOnly]="!!invite()"
        />
      </app-field>
      @if (!invite()) {
        <app-field
          label="Workspace name"
          hint="Usually your team or company. You can add more later."
        >
          <input
            class="input"
            appFieldControl
            formControlName="workspaceName"
            autocomplete="organization"
          />
        </app-field>
      }
      <app-field label="Password" hint="At least 8 characters.">
        <input
          class="input"
          appFieldControl
          type="password"
          formControlName="password"
          autocomplete="new-password"
        />
      </app-field>
      <button
        type="submit"
        class="btn btn--primary auth-submit"
        [disabled]="submitting()"
        [attr.aria-busy]="submitting()"
      >
        @if (submitting()) {
          <span class="spinner" aria-hidden="true"></span>
        }
        {{ invite() ? 'Create account and join' : 'Create account' }}
      </button>
    </form>

    <p class="auth-footer">Already have an account? <a routerLink="/login">Sign in</a></p>
  `,
  styleUrl: './auth-pages.scss',
})
export default class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Query params of an invitation link.
  readonly invite = input<string>();
  readonly email = input<string>();

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    firstName: ['', [Validators.required, Validators.maxLength(255)]],
    lastName: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email]],
    workspaceName: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
  });

  constructor() {
    effect(() => {
      if (!this.invite()) return;
      this.form.controls.email.setValue(this.email() ?? '');
      this.form.controls.workspaceName.disable();
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { workspaceName, ...rest } = this.form.getRawValue();
    const invitationToken = this.invite();
    this.submitting.set(true);
    this.error.set(null);
    this.auth
      .register(invitationToken ? { ...rest, invitationToken } : { ...rest, workspaceName })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: (err: unknown) => {
          const apiError = toApiError(err);
          if (!applyServerErrors(this.form, apiError)) this.error.set(apiError.message);
        },
      });
  }
}
