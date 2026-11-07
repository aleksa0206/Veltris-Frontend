import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PersonRef } from '../../core/api/models';

// Hues spaced around the wheel; lightness and saturation come from the theme tokens
// (`--avatar-bg`, `--avatar-fg`), so every avatar is quiet in both light and dark.
const HUES = [222, 168, 262, 32, 340, 98, 200, 14];

/** Initials avatar. Decorative next to the person's name, so it is hidden from screen readers. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.42',
    '[style.--hue]': 'hue()',
  },
  template: `{{ initials() }}`,
  styles: `
    :host {
      display: inline-grid;
      flex-shrink: 0;
      place-items: center;
      border-radius: var(--radius-full);
      background: hsl(var(--hue) var(--avatar-bg));
      color: hsl(var(--hue) var(--avatar-fg));
      font-weight: var(--font-weight-semibold);
      line-height: 1;
      user-select: none;
    }
  `,
})
export class Avatar {
  readonly person = input.required<PersonRef>();
  readonly size = input(24);

  protected readonly initials = computed(() => {
    const { firstName, lastName } = this.person();
    return `${firstName.charAt(0)}${lastName?.charAt(0) ?? ''}`.toUpperCase();
  });

  protected readonly hue = computed(() => HUES[this.person().id % HUES.length]);
}
