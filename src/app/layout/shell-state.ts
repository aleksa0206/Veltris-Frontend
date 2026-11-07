import { Injectable, signal } from '@angular/core';

/** UI state shared between the shell and the pages' headers. */
@Injectable({ providedIn: 'root' })
export class ShellState {
  /** Sidebar drawer on narrow screens. */
  readonly navOpen = signal(false);
  readonly paletteOpen = signal(false);
}
