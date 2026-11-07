import { ChangeDetectionStrategy, Component, inject, Injectable, signal } from '@angular/core';
import { Icon } from './icon';

interface Toast {
  id: number;
  tone: 'success' | 'danger';
  message: string;
}

const TOAST_DURATION_MS = 4000;

/** Transient notifications for the outcome of an action ("Task created", "Could not save"). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('danger', message);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private show(tone: Toast['tone'], message: string): void {
    const id = ++this.nextId;
    this.toasts.update((list) => [...list, { id, tone, message }]);
    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
  }
}

@Component({
  selector: 'app-toast-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class.toast--danger]="toast.tone === 'danger'">
          <app-icon [name]="toast.tone === 'danger' ? 'alert' : 'checkCircle'" />
          <span>{{ toast.message }}</span>
          <button
            type="button"
            class="btn btn--ghost btn--icon btn--sm"
            aria-label="Dismiss notification"
            (click)="toastService.dismiss(toast.id)"
          >
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      right: var(--space-4);
      bottom: var(--space-4);
      z-index: var(--z-toast);
      display: grid;
      gap: var(--space-2);
      width: min(360px, calc(100vw - 32px));
    }
    .toast {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 40px;
      padding: var(--space-1) var(--space-1) var(--space-1) var(--space-3);
      border-radius: var(--radius-lg);
      background: var(--color-surface-raised);
      box-shadow: var(--shadow-overlay);
      animation: toast-in var(--duration-base) var(--ease-standard);
    }
    .toast > app-icon {
      color: var(--color-success);
    }
    .toast span {
      flex: 1;
    }
    .toast--danger > app-icon {
      color: var(--color-danger);
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }
  `,
})
export class ToastOutlet {
  protected readonly toastService = inject(ToastService);
}
