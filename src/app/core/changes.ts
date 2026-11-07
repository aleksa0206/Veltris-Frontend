import { Injectable, signal } from '@angular/core';

export type ChangeTopic = 'workspace' | 'projects' | 'tasks';

/**
 * Version counters per data area. A page that reads e.g. tasks puts `changes.tasks()` into its
 * rxResource params, so it reloads when anything (a dialog, the side panel, the command palette)
 * reports a change.
 */
@Injectable({ providedIn: 'root' })
export class Changes {
  readonly workspace = signal(0);
  readonly projects = signal(0);
  readonly tasks = signal(0);

  notify(...topics: ChangeTopic[]): void {
    for (const topic of topics) {
      this[topic].update((v) => v + 1);
    }
  }
}
