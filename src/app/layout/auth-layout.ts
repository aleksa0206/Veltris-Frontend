import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <main class="auth">
      <div class="auth__column">
        <p class="auth__brand">
          <img src="icons/favicon.svg" alt="" width="28" height="28" />
          Veltris
        </p>
        <div class="auth__panel">
          <router-outlet />
        </div>
        <p class="auth__tagline">Projects, tasks and boards for teams that plan carefully.</p>
      </div>
    </main>
  `,
  styles: `
    .auth {
      display: grid;
      place-items: start center;
      height: 100%;
      overflow-y: auto;
      padding: 14vh var(--space-4) var(--space-8);
    }
    .auth__column {
      display: grid;
      gap: var(--space-6);
      width: 100%;
      max-width: 380px;
    }
    .auth__brand {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-heading);
      font-weight: var(--font-weight-semibold);
      letter-spacing: var(--letter-spacing-tighter);
    }
    .auth__panel {
      padding: var(--space-6);
      border: var(--border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-card);
    }
    .auth__panel ::ng-deep h1 {
      font-size: var(--font-size-heading);
      line-height: var(--line-height-heading);
      letter-spacing: var(--letter-spacing-tight);
    }
    .auth__tagline {
      color: var(--color-text-tertiary);
      font-size: var(--font-size-meta);
    }
    @media (max-width: 480px) {
      .auth {
        padding-top: var(--space-8);
      }
      .auth__panel {
        padding: var(--space-5) var(--space-4);
      }
    }
  `,
})
export class AuthLayout {}
