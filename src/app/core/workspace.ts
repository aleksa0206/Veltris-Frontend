import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';
import { WorkspaceSummary } from './api/models';
import { WorkspacesApi } from './api/resources';
import { Changes } from './changes';

const STORAGE_KEY = 'veltris.workspace';

/**
 * The workspace the user is working in. Projects and tasks have global ids, so only screens that
 * list across the workspace (overview, project list, search) read it; it is kept per browser.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceContext {
  private readonly api = inject(WorkspacesApi);
  private readonly changes = inject(Changes);

  readonly workspaces = signal<WorkspaceSummary[]>([]);
  private readonly selectedId = signal<number | null>(null);

  readonly current = computed(
    () => this.workspaces().find((w) => w.id === this.selectedId()) ?? this.workspaces()[0] ?? null,
  );
  readonly id = computed(() => this.current()?.id ?? null);
  readonly canManage = computed(() => this.current()?.role !== 'Member');

  /** Members of the current workspace, for assignee and lead pickers. */
  readonly details = rxResource({
    params: () => ({ id: this.id(), version: this.changes.workspace() }),
    stream: ({ params: { id } }) => (id ? this.api.get(id) : of(null)),
  });
  readonly members = computed(() => this.details.value()?.members ?? []);

  private loadedFor: number | null = null;

  /** Loads the signed-in user's workspaces once per session (route guard). */
  async load(userId: number): Promise<void> {
    if (this.loadedFor === userId) return;
    this.workspaces.set(await firstValueFrom(this.api.mine()));
    this.loadedFor = userId;
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    this.selectedId.set(this.workspaces().some((w) => w.id === stored) ? stored : null);
  }

  select(id: number): void {
    this.selectedId.set(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }

  /**
   * Reloads the list after joining, creating or leaving a workspace, and switches to `selectId`
   * when given (otherwise `current` falls back to the first one if the old one is gone).
   */
  async reload(selectId?: number): Promise<void> {
    this.workspaces.set(await firstValueFrom(this.api.mine()));
    if (selectId !== undefined) this.select(selectId);
  }
}
