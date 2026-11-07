import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  PersonRef,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskPriority,
  TaskStatus,
} from '../../core/api/models';
import { fullName } from '../util/format';
import { PRIORITY_LABELS, STATUS_LABELS } from '../util/task-text';
import { Avatar } from './avatar';
import { Icon } from './icon';
import { PriorityIcon, StatusIcon } from './indicators';
import { Picker, PickerOptionTemplate } from './picker';

// The three task properties edited the same way everywhere (property rail, dialogs, filters).

const STATUS_OPTIONS = TASK_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }));
const PRIORITY_OPTIONS = TASK_PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }));

@Component({
  selector: 'app-status-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Picker, PickerOptionTemplate, StatusIcon],
  template: `
    <app-picker
      label="Status"
      [options]="options"
      [value]="value()"
      [appearance]="appearance()"
      [disabled]="disabled()"
      (valueChange)="valueChange.emit($event)"
    >
      <ng-template appPickerOption let-option>
        <app-status-icon [status]="option.value" decorative />
        {{ option.label }}
      </ng-template>
    </app-picker>
  `,
})
export class StatusPicker {
  readonly value = input.required<TaskStatus>();
  readonly appearance = input<'field' | 'button'>('field');
  readonly disabled = input(false);
  readonly valueChange = output<TaskStatus>();
  protected readonly options = STATUS_OPTIONS;
}

@Component({
  selector: 'app-priority-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Picker, PickerOptionTemplate, PriorityIcon],
  template: `
    <app-picker
      label="Priority"
      [options]="options"
      [value]="value()"
      [appearance]="appearance()"
      [disabled]="disabled()"
      (valueChange)="valueChange.emit($event)"
    >
      <ng-template appPickerOption let-option>
        <app-priority-icon [priority]="option.value" decorative />
        {{ option.label }}
      </ng-template>
    </app-picker>
  `,
})
export class PriorityPicker {
  readonly value = input.required<TaskPriority>();
  readonly appearance = input<'field' | 'button'>('field');
  readonly disabled = input(false);
  readonly valueChange = output<TaskPriority>();
  protected readonly options = PRIORITY_OPTIONS;
}

/** `null` = unassigned. */
@Component({
  selector: 'app-assignee-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Picker, PickerOptionTemplate, Avatar, Icon],
  template: `
    <app-picker
      [label]="label()"
      [options]="options()"
      [value]="value()"
      [appearance]="appearance()"
      [disabled]="disabled()"
      (valueChange)="valueChange.emit($event)"
    >
      <ng-template appPickerOption let-option>
        @if (option.value === null) {
          <app-icon name="user" [size]="16" class="unassigned" />
        } @else {
          <app-avatar [person]="person(option.value)" [size]="18" />
        }
        {{ option.label }}
      </ng-template>
    </app-picker>
  `,
  styles: `
    .unassigned {
      color: var(--color-text-tertiary);
    }
  `,
})
export class AssigneePicker {
  readonly value = input.required<number | null>();
  readonly people = input.required<PersonRef[]>();
  readonly label = input('Assignee');
  readonly emptyLabel = input('Unassigned');
  readonly appearance = input<'field' | 'button'>('field');
  readonly disabled = input(false);
  readonly valueChange = output<number | null>();

  protected readonly options = computed(() => [
    { value: null as number | null, label: this.emptyLabel() },
    ...this.people().map((p) => ({ value: p.id as number | null, label: fullName(p) })),
  ]);

  protected person(id: number): PersonRef {
    return this.people().find((p) => p.id === id) ?? { id, firstName: '?', lastName: null };
  }
}
