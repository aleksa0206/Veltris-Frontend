import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TaskPriority, TaskStatus } from '../../core/api/models';
import { PRIORITY_LABELS, STATUS_LABELS } from '../util/task-text';

// Status and priority are told apart by shape first and colour second, so they stay readable for
// colour-blind users and in greyscale. Next to a visible label, pass `decorative` so screen
// readers do not hear the value twice.

const STATUS_CLASS: Record<TaskStatus, string> = {
  Backlog: 'backlog',
  Todo: 'todo',
  InProgress: 'in-progress',
  InReview: 'in-review',
  Done: 'done',
  Cancelled: 'cancelled',
};

/** Fraction of the ring filled for statuses that are under way. */
const PIE: Partial<Record<TaskStatus, number>> = { InProgress: 0.5, InReview: 0.75 };

function piePath(fraction: number): string {
  const angle = fraction * 2 * Math.PI;
  const x = 7 + 3.5 * Math.sin(angle);
  const y = 7 - 3.5 * Math.cos(angle);
  return `M7 7V3.5A3.5 3.5 0 ${fraction > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`;
}

@Component({
  selector: 'app-status-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"indicator status--" + cssClass()',
    '[attr.role]': 'decorative() ? null : "img"',
    '[attr.aria-label]': 'decorative() ? null : label()',
    '[attr.aria-hidden]': 'decorative() || null',
  },
  template: `
    <svg viewBox="0 0 14 14" [attr.width]="size()" [attr.height]="size()">
      @switch (status()) {
        @case ('Done') {
          <circle cx="7" cy="7" r="6" class="fill" />
          <path d="M4.4 7.2 6.2 9l3.4-3.6" class="mark" />
        }
        @case ('Cancelled') {
          <circle cx="7" cy="7" r="6" class="fill" />
          <path d="M5 5l4 4M9 5l-4 4" class="mark" />
        }
        @default {
          <circle
            cx="7"
            cy="7"
            r="5.5"
            class="ring"
            [attr.stroke-dasharray]="status() === 'Backlog' ? '2 2.3' : null"
          />
          @if (pie(); as d) {
            <path [attr.d]="d" class="fill" />
          }
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      color: var(--status-color);
    }
    .ring {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
    }
    .fill {
      fill: currentColor;
    }
    .mark {
      fill: none;
      stroke: var(--color-surface);
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    :host(.status--backlog) {
      --status-color: var(--color-status-backlog);
    }
    :host(.status--todo) {
      --status-color: var(--color-status-todo);
    }
    :host(.status--in-progress) {
      --status-color: var(--color-status-in-progress);
    }
    :host(.status--in-review) {
      --status-color: var(--color-status-in-review);
    }
    :host(.status--done) {
      --status-color: var(--color-status-done);
    }
    :host(.status--cancelled) {
      --status-color: var(--color-status-cancelled);
    }
  `,
})
export class StatusIcon {
  readonly status = input.required<TaskStatus>();
  readonly size = input(14);
  readonly decorative = input(false, { transform: booleanAttribute });

  protected readonly cssClass = computed(() => STATUS_CLASS[this.status()]);
  protected readonly label = computed(() => `Status: ${STATUS_LABELS[this.status()]}`);
  protected readonly pie = computed(() => {
    const fraction = PIE[this.status()];
    return fraction ? piePath(fraction) : null;
  });
}

const BARS: Record<TaskPriority, number> = { None: 0, Low: 1, Medium: 2, High: 3, Urgent: 3 };

@Component({
  selector: 'app-priority-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"indicator priority--" + priority().toLowerCase()',
    '[attr.role]': 'decorative() ? null : "img"',
    '[attr.aria-label]': 'decorative() ? null : label()',
    '[attr.aria-hidden]': 'decorative() || null',
  },
  template: `
    <svg viewBox="0 0 14 14" [attr.width]="size()" [attr.height]="size()">
      @if (priority() === 'Urgent') {
        <rect x="1" y="1" width="12" height="12" rx="2.5" class="on" />
        <path d="M7 3.8v4M7 10.1v.1" class="mark" />
      } @else {
        @for (bar of [0, 1, 2]; track bar) {
          <rect
            [attr.x]="1.5 + bar * 4"
            [attr.y]="9 - bar * 3"
            width="3"
            [attr.height]="3 + bar * 3"
            rx="0.75"
            [class.on]="bar < bars()"
            [class.off]="bar >= bars()"
          />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      color: var(--priority-color, var(--color-text-tertiary));
    }
    .on {
      fill: currentColor;
    }
    .off {
      fill: var(--color-border-strong);
    }
    .mark {
      stroke: var(--color-surface);
      stroke-width: 1.8;
      stroke-linecap: round;
    }
    :host(.priority--urgent) {
      --priority-color: var(--color-priority-urgent);
    }
    :host(.priority--high) {
      --priority-color: var(--color-priority-high);
    }
    :host(.priority--medium) {
      --priority-color: var(--color-priority-medium);
    }
    :host(.priority--low) {
      --priority-color: var(--color-priority-low);
    }
  `,
})
export class PriorityIcon {
  readonly priority = input.required<TaskPriority>();
  readonly size = input(14);
  readonly decorative = input(false, { transform: booleanAttribute });

  protected readonly bars = computed(() => BARS[this.priority()]);
  protected readonly label = computed(() => `Priority: ${PRIORITY_LABELS[this.priority()]}`);
}
