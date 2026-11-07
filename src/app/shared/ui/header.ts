import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShellState } from '../../layout/shell-state';
import { Icon } from './icon';

export interface Crumb {
  label: string;
  /** Router link; the last crumb (current page) has none. */
  link?: string | unknown[];
  /** Rendered in the monospace face, e.g. a task identifier. */
  mono?: boolean;
}

/**
 * The top bar of every screen: where you are (breadcrumbs) on the left, what you can do here on
 * the right (projected). The page title itself is the last crumb, so there is no second
 * heading competing with it.
 */
@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  template: `
    <button
      type="button"
      class="btn btn--ghost btn--icon header__menu"
      aria-label="Open navigation"
      (click)="shell.navOpen.set(true)"
    >
      <app-icon name="menu" />
    </button>
    <nav class="crumbs" aria-label="Breadcrumb">
      <ol>
        @for (crumb of crumbs(); track $index; let last = $last) {
          <li>
            @if (crumb.link && !last) {
              <a [routerLink]="crumb.link" [class.mono]="crumb.mono">{{ crumb.label }}</a>
              <app-icon name="chevronRight" [size]="14" class="crumbs__sep" />
            } @else {
              <h1 aria-current="page" [class.mono]="crumb.mono">{{ crumb.label }}</h1>
            }
          </li>
        }
      </ol>
    </nav>
    <div class="header__actions"><ng-content /></div>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      position: sticky;
      top: 0;
      z-index: var(--z-sticky);
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: var(--space-3);
      height: var(--header-height);
      padding: 0 var(--space-4) 0 var(--space-6);
      border-bottom: var(--border);
      background: var(--color-surface);
      @include down('md') {
        padding: 0 var(--space-3) 0 var(--space-2);
      }
    }
    .header__menu {
      display: none;
      @include down('md') {
        display: inline-flex;
      }
    }
    .crumbs {
      flex: 1;
      min-width: 0;
    }
    ol {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      min-width: 0;
    }
    li {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      min-width: 0;
    }
    a {
      color: var(--color-text-tertiary);
      white-space: nowrap;
      transition: color var(--duration-fast) var(--ease-standard);
    }
    a:hover {
      color: var(--color-text);
      text-decoration: none;
    }
    h1 {
      @include truncate;
      font-size: var(--font-size-body-lg);
      line-height: var(--line-height-body-lg);
      font-weight: var(--font-weight-medium);
    }
    h1.mono {
      font-weight: var(--font-weight-regular);
    }
    .crumbs__sep {
      color: var(--color-text-disabled);
    }
    .header__actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
  `,
})
export class Header {
  readonly crumbs = input.required<Crumb[]>();
  protected readonly shell = inject(ShellState);
}
