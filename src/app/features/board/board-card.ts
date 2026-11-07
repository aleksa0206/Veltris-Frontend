import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Task } from '../../core/api/models';
import { Avatar } from '../../shared/ui/avatar';
import { Icon } from '../../shared/ui/icon';
import { PriorityIcon } from '../../shared/ui/indicators';
import { todayIso } from '../../shared/util/dates';
import { fullName } from '../../shared/util/format';
import { dueInfo, taskIdentifier } from '../../shared/util/task-text';

/**
 * A board card: identifier and priority on top, the title, then only the metadata that exists
 * (due date, subtask progress, comments, assignee). The title link opens the task in the side
 * panel; the whole card is its click target.
 */
@Component({
  selector: 'app-board-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Avatar, Icon, PriorityIcon],
  template: `
    <div class="card__top">
      <span class="mono card__id">{{ identifier() }}</span>
      @if (task().priority !== 'None') {
        <app-priority-icon [priority]="task().priority" />
      }
    </div>
    <a
      class="card__title"
      [routerLink]="[]"
      [queryParams]="{ task: task().id }"
      queryParamsHandling="merge"
      >{{ task().title }}</a
    >
    @if (hasMeta()) {
      <div class="card__meta">
        @if (due(); as d) {
          <span class="card__due" [attr.data-tone]="d.tone">
            <app-icon name="calendar" [size]="12" />{{ d.text }}
          </span>
        }
        @if (task().subtaskCount) {
          <span
            [attr.aria-label]="
              task().subtasksDone + ' of ' + task().subtaskCount + ' subtasks done'
            "
          >
            <app-icon name="subtasks" [size]="12" />{{ task().subtasksDone }}/{{
              task().subtaskCount
            }}
          </span>
        }
        @if (task().commentCount) {
          <span [attr.aria-label]="task().commentCount + ' comments'">
            <app-icon name="message" [size]="12" />{{ task().commentCount }}
          </span>
        }
        @if (task().assignee; as person) {
          <app-avatar class="card__assignee" [person]="person" [size]="20" />
          <span class="visually-hidden">Assigned to {{ name(person) }}</span>
        }
      </div>
    }
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      position: relative;
      display: grid;
      gap: var(--space-1-5);
      padding: var(--space-2-5) var(--space-3) var(--space-3);
      border: var(--border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      box-shadow: var(--shadow-card);
      cursor: grab;
      transition: border-color var(--duration-fast) var(--ease-standard);
    }
    :host(:hover) {
      border-color: var(--color-border-strong);
    }
    :host-context([data-theme='dark']) {
      background: var(--color-surface-raised);
    }
    .card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 16px;
    }
    .card__id {
      color: var(--color-text-tertiary);
      font-size: var(--font-size-micro);
    }
    .card__title {
      display: -webkit-box;
      overflow: hidden;
      color: var(--color-text);
      font-weight: var(--font-weight-medium);
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }
    .card__title::after {
      content: '';
      position: absolute;
      inset: 0;
    }
    .card__title:hover {
      text-decoration: none;
    }
    .card__meta {
      display: flex;
      align-items: center;
      gap: var(--space-2-5);
      margin-top: var(--space-1);
      color: var(--color-text-tertiary);
      font-size: var(--font-size-meta);
      font-variant-numeric: tabular-nums;
      > span {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
      }
    }
    .card__due[data-tone='overdue'] {
      color: var(--color-danger);
    }
    .card__due[data-tone='today'] {
      color: var(--color-warning);
    }
    .card__assignee {
      margin-left: auto;
    }
  `,
})
export class BoardCard {
  readonly task = input.required<Task>();

  protected readonly identifier = computed(() => taskIdentifier(this.task()));
  protected readonly due = computed(() =>
    dueInfo(this.task().dueDate, todayIso(), this.task().status),
  );
  protected readonly hasMeta = computed(() => {
    const t = this.task();
    return !!(this.due() || t.subtaskCount || t.commentCount || t.assignee);
  });
  protected readonly name = fullName;
}
