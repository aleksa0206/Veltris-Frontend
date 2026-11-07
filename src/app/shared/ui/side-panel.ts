import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Panel sliding in from the right over the current screen (task peek on the board). It is a
 * modal dialog: focus is trapped inside and returns to the trigger when it closes; Escape or a
 * click outside closes it. The caller owns the open state (usually a query param).
 */
@Component({
  selector: 'app-side-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule],
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="side-panel__backdrop" (click)="closed.emit()"></div>
    <aside
      class="side-panel"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="label()"
      cdkTrapFocus
      [cdkTrapFocusAutoCapture]="true"
    >
      <ng-content />
    </aside>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: var(--z-overlay);
    }
    .side-panel__backdrop {
      position: absolute;
      inset: 0;
      background: var(--color-backdrop);
      opacity: 0.5;
      animation: fade-in var(--duration-base) var(--ease-standard);
    }
    .side-panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      width: min(var(--side-panel-width), 100vw);
      border-left: var(--border);
      background: var(--color-surface);
      box-shadow: var(--shadow-overlay);
      animation: slide-in var(--duration-slow) var(--ease-standard);
    }
    @keyframes slide-in {
      from {
        transform: translateX(24px);
        opacity: 0;
      }
    }
    @keyframes fade-in {
      from {
        opacity: 0;
      }
    }
  `,
})
export class SidePanel {
  readonly label = input.required<string>();
  readonly closed = output();
}
