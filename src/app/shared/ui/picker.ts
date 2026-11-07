import { CdkMenu, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { Icon } from './icon';

export interface PickerOption<T> {
  value: T;
  label: string;
}

/** How an option looks (indicator + label); used for both the trigger and the menu rows. */
@Directive({ selector: 'ng-template[appPickerOption]' })
export class PickerOptionTemplate<T> {
  static ngTemplateContextGuard<T>(
    _dir: PickerOptionTemplate<T>,
    ctx: unknown,
  ): ctx is { $implicit: PickerOption<T> } {
    return true;
  }
}

/**
 * Select menu for values that need more than text (status, priority, people). Keyboard and
 * focus handling come from the CDK menu; the options are radio items, so the current value is
 * announced as checked.
 *
 * `field`: full-width row in a property list. `button`: compact control in toolbars and cards.
 */
@Component({
  selector: 'app-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkMenu, CdkMenuItemRadio, CdkMenuTrigger, NgTemplateOutlet, Icon],
  template: `
    <button
      type="button"
      class="picker__trigger"
      [class.picker__trigger--field]="appearance() === 'field'"
      [class.btn]="appearance() === 'button'"
      [class.btn--sm]="appearance() === 'button'"
      [cdkMenuTriggerFor]="menu"
      [disabled]="disabled()"
      [attr.aria-label]="label() + ': ' + (selected()?.label ?? placeholder())"
    >
      @if (selected(); as option) {
        <ng-container
          [ngTemplateOutlet]="optionTemplate() ?? plain"
          [ngTemplateOutletContext]="{ $implicit: option }"
        />
      } @else {
        <span class="picker__placeholder">{{ placeholder() }}</span>
      }
      @if (appearance() === 'field') {
        <app-icon name="chevronUpDown" [size]="14" class="picker__chevron" />
      }
    </button>

    <ng-template #menu>
      <div class="menu" cdkMenu [attr.aria-label]="label()">
        @for (option of options(); track option.value) {
          <button
            type="button"
            class="menu__item"
            cdkMenuItemRadio
            [cdkMenuItemChecked]="option.value === value()"
            (cdkMenuItemTriggered)="valueChange.emit(option.value)"
          >
            <ng-container
              [ngTemplateOutlet]="optionTemplate() ?? plain"
              [ngTemplateOutletContext]="{ $implicit: option }"
            />
            @if (option.value === value()) {
              <app-icon name="check" [size]="14" class="menu__check" />
            }
          </button>
        }
      </div>
    </ng-template>

    <ng-template #plain let-option>{{ option.label }}</ng-template>
  `,
  styles: `
    :host {
      display: inline-flex;
      min-width: 0;
    }
    .picker__trigger {
      gap: var(--space-1-5);
      min-width: 0;
      white-space: nowrap;
    }
    .picker__trigger--field {
      display: flex;
      align-items: center;
      width: 100%;
      height: var(--control-height);
      padding: 0 var(--space-2);
      margin: 0 calc(-1 * var(--space-2));
      border: 0;
      border-radius: var(--radius-md);
      background: none;
      color: var(--color-text);
      text-align: left;
      transition: var(--transition-colors);
    }
    .picker__trigger--field:hover:not(:disabled) {
      background: var(--color-state-hover);
    }
    .picker__trigger--field:disabled {
      cursor: default;
    }
    .picker__chevron {
      margin-left: auto;
      color: var(--color-text-tertiary);
      opacity: 0;
      transition: opacity var(--duration-fast) var(--ease-standard);
    }
    .picker__trigger--field:hover .picker__chevron,
    .picker__trigger--field:focus-visible .picker__chevron {
      opacity: 1;
    }
    .picker__placeholder {
      color: var(--color-text-tertiary);
    }
  `,
})
export class Picker<T> {
  readonly options = input.required<PickerOption<T>[]>();
  readonly value = input.required<T>();
  readonly label = input.required<string>();
  readonly placeholder = input('None');
  readonly appearance = input<'field' | 'button'>('field');
  readonly disabled = input(false);
  readonly valueChange = output<T>();

  protected readonly optionTemplate = contentChild(PickerOptionTemplate, { read: TemplateRef });
  protected readonly selected = computed(() =>
    this.options().find((option) => option.value === this.value()),
  );
}
