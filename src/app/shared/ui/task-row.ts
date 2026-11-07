import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Task } from '../../core/api/models';
import { todayIso } from '../util/dates';
import { dueInfo, taskIdentifier } from '../util/task-text';
import { Avatar } from './avatar';
import { PriorityIcon, StatusIcon } from './indicators';
import { Tooltip } from './tooltip';

/**
 * A task as one dense row: status, identifier, title, then due date, priority and assignee in
 * fixed slots so columns line up down a list. Used as `<li appTaskRow [task]>`.
 */
@Component({
  selector: 'li[appTaskRow]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusIcon, PriorityIcon, Avatar, Tooltip],
  template: `
    <app-status-icon [status]="task().status" />
    <span class="task-row__id mono">{{ identifier() }}</span>
    <a class="task-row__title" [routerLink]="['/tasks', task().id]">{{ task().title }}</a>
    <span class="task-row__due" [attr.data-tone]="due()?.tone">{{ due()?.text }}</span>
    <app-priority-icon [priority]="task().priority" />
    <span class="task-row__assignee">
      @if (task().assignee; as person) {
        <app-avatar [person]="person" [size]="20" [appTooltip]="assigneeName()" />
        <span class="visually-hidden">{{ assigneeName() }}</span>
      }
    </span>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      position: relative;
      display: grid;
      grid-template-columns: 14px 64px minmax(0, 1fr) auto 14px 20px;
      align-items: center;
      gap: var(--space-3);
      height: var(--row-height);
      padding: 0 var(--space-3);
      @include interactive-row;
    }
    :host + :host {
      border-top: var(--border-subtle);
    }
    .task-row__id {
      color: var(--color-text-tertiary);
    }
    .task-row__title {
      @include truncate;
      color: var(--color-text);
    }
    // The whole row is the link target; the title stays the accessible name.
    .task-row__title::after {
      content: '';
      position: absolute;
      inset: 0;
    }
    .task-row__title:hover {
      text-decoration: none;
    }
    .task-row__due {
      color: var(--color-text-tertiary);
      font-size: var(--font-size-meta);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .task-row__due[data-tone='overdue'] {
      color: var(--color-danger);
    }
    .task-row__due[data-tone='today'] {
      color: var(--color-warning);
    }
    .task-row__assignee {
      position: relative;
      z-index: var(--z-raised);
      display: flex;
    }
  `,
})
export class TaskRow {
  readonly task = input.required<Task>();
  protected readonly identifier = computed(() => taskIdentifier(this.task()));
  protected readonly due = computed(() =>
    dueInfo(this.task().dueDate, todayIso(), this.task().status),
  );
  protected readonly assigneeName = computed(() => {
    const person = this.task().assignee;
    return person ? `Assigned to ${person.firstName} ${person.lastName ?? ''}`.trim() : '';
  });
}
