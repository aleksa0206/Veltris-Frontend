import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, of } from 'rxjs';
import { ProjectsApi, TasksApi } from '../core/api/resources';
import { AuthService } from '../core/auth/auth.service';
import { ThemeService } from '../core/theme';
import { WorkspaceContext } from '../core/workspace';
import { Editors } from '../shared/editors';
import { Icon, IconName } from '../shared/ui/icon';
import { StatusIcon } from '../shared/ui/indicators';
import { Task, TaskStatus } from '../core/api/models';
import { taskIdentifier } from '../shared/util/task-text';

interface Command {
  id: string;
  group: 'Tasks' | 'Projects' | 'Go to' | 'Actions';
  label: string;
  hint?: string;
  icon?: IconName;
  status?: TaskStatus;
  run: () => void;
}

const SEARCH_DEBOUNCE_MS = 180;
const MAX_TASKS = 8;

function matches(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Keyboard-first jump-to and actions (Ctrl/⌘ K). Tasks are searched on the server (title or
 * identifier such as WEB-12); projects, pages and actions are filtered locally. Follows the
 * ARIA combobox pattern: focus stays in the input, arrows move the active option.
 */
@Component({
  selector: 'app-command-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon, StatusIcon],
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="palette__backdrop" (click)="closed.emit()"></div>
    <div
      class="palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      cdkTrapFocus
      [cdkTrapFocusAutoCapture]="true"
    >
      <div class="palette__search">
        <app-icon name="search" />
        <input
          #box
          cdkFocusInitial
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-autocomplete="list"
          [attr.aria-activedescendant]="activeId()"
          placeholder="Search tasks, projects and actions…"
          [value]="query()"
          (input)="setQuery(box.value)"
          (keydown)="onKeydown($event)"
        />
        @if (tasks.isLoading()) {
          <span class="spinner" aria-hidden="true"></span>
        }
      </div>

      <ul id="palette-list" class="palette__list" role="listbox" aria-label="Results">
        @for (command of commands(); track command.id; let i = $index) {
          @if (i === 0 || commands()[i - 1].group !== command.group) {
            <li class="palette__group" role="presentation">{{ command.group }}</li>
          }
          <li
            role="option"
            class="palette__option"
            [id]="'cmd-' + command.id"
            [class.is-active]="i === active()"
            [attr.aria-selected]="i === active()"
            (mousemove)="active.set(i)"
            (click)="run(command)"
          >
            @if (command.status) {
              <app-status-icon [status]="command.status" decorative />
            } @else if (command.icon) {
              <app-icon [name]="command.icon" />
            }
            <span class="palette__label">{{ command.label }}</span>
            @if (command.hint) {
              <span class="palette__hint mono">{{ command.hint }}</span>
            }
          </li>
        } @empty {
          <li class="palette__empty" role="presentation">
            {{ tasks.isLoading() ? 'Searching…' : 'Nothing matches “' + query() + '”.' }}
          </li>
        }
      </ul>

      <div class="palette__footer text-meta" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd> to move</span>
        <span><kbd>↵</kbd> to open</span>
        <span><kbd>Esc</kbd> to close</span>
      </div>
    </div>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      position: fixed;
      inset: 0;
      z-index: var(--z-overlay);
      display: flex;
      justify-content: center;
      padding: 12vh var(--space-4) 0;
    }
    .palette__backdrop {
      position: absolute;
      inset: 0;
      background: var(--color-backdrop);
    }
    .palette {
      position: relative;
      display: flex;
      flex-direction: column;
      width: min(620px, 100%);
      max-height: min(480px, 72vh);
      overflow: hidden;
      border-radius: var(--radius-lg);
      background: var(--color-surface-raised);
      box-shadow: var(--shadow-overlay);
      animation: dialog-in var(--duration-base) var(--ease-standard);
    }
    .palette__search {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      height: 48px;
      padding: 0 var(--space-4);
      border-bottom: var(--border);
      color: var(--color-text-tertiary);
    }
    input {
      flex: 1;
      height: 100%;
      border: 0;
      background: none;
      color: var(--color-text);
      font-size: var(--font-size-body-lg);
      outline: none;
    }
    input::placeholder {
      color: var(--color-text-tertiary);
    }
    input:focus-visible {
      box-shadow: none;
    }
    .palette__list {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-1) var(--space-2) var(--space-2);
    }
    .palette__group {
      padding: var(--space-3) var(--space-2) var(--space-1);
      @include text('meta');
    }
    .palette__option {
      display: flex;
      align-items: center;
      gap: var(--space-2-5);
      height: 34px;
      padding: 0 var(--space-2);
      border-radius: var(--radius-md);
      cursor: pointer;
      > .icon {
        color: var(--color-text-tertiary);
      }
    }
    .palette__option.is-active {
      background: var(--color-state-pressed);
    }
    .palette__label {
      flex: 1;
      @include truncate;
    }
    .palette__hint {
      color: var(--color-text-tertiary);
    }
    .palette__empty {
      padding: var(--space-6) var(--space-2);
      color: var(--color-text-tertiary);
      text-align: center;
    }
    .palette__footer {
      display: flex;
      gap: var(--space-4);
      padding: var(--space-2) var(--space-4);
      border-top: var(--border-subtle);
      background: var(--color-surface-subtle);
      kbd {
        margin-right: 2px;
      }
    }
  `,
})
export class CommandPalette {
  readonly closed = output();

  private readonly router = inject(Router);
  private readonly workspace = inject(WorkspaceContext);
  private readonly tasksApi = inject(TasksApi);
  private readonly projectsApi = inject(ProjectsApi);
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly editors = inject(Editors);

  protected readonly query = signal('');
  protected readonly active = signal(0);

  private readonly debouncedQuery = toSignal(
    toObservable(this.query).pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged()),
    { initialValue: '' },
  );

  protected readonly tasks = rxResource({
    params: () => ({ id: this.workspace.id(), search: this.debouncedQuery().trim() }),
    stream: ({ params: { id, search } }) =>
      id && search.length >= 2
        ? this.tasksApi.search(id, { search, topLevel: false, limit: MAX_TASKS, sort: 'updated' })
        : of(null),
  });

  // Loaded once per opening; the palette is short-lived.
  private readonly projects = rxResource({
    params: () => this.workspace.id(),
    stream: ({ params: id }) => (id ? this.projectsApi.list(id, { limit: 100 }) : of(null)),
  });

  protected readonly commands = computed<Command[]>(() => {
    const query = this.query().trim();
    const go = (url: string | unknown[]) => () =>
      void (Array.isArray(url) ? this.router.navigate(url) : this.router.navigateByUrl(url));

    const tasks: Command[] = (this.tasks.value()?.data ?? []).map((task: Task) => ({
      id: `task-${task.id}`,
      group: 'Tasks',
      label: task.title,
      hint: taskIdentifier(task),
      status: task.status,
      run: go(['/tasks', task.id]),
    }));

    const projects: Command[] = (this.projects.value()?.data ?? [])
      .filter((p) => !query || matches(p.name, query) || matches(p.key, query))
      .slice(0, 6)
      .map((p) => ({
        id: `project-${p.id}`,
        group: 'Projects',
        label: p.name,
        hint: p.key,
        icon: 'board',
        run: go(['/projects', p.id]),
      }));

    const static_: Command[] = [
      { id: 'go-overview', group: 'Go to', label: 'Overview', icon: 'home', run: go('/') },
      {
        id: 'go-projects',
        group: 'Go to',
        label: 'All projects',
        icon: 'folder',
        run: go('/projects'),
      },
      { id: 'go-account', group: 'Go to', label: 'Account', icon: 'user', run: go('/account') },
      {
        id: 'new-project',
        group: 'Actions',
        label: 'Create project',
        icon: 'plus',
        run: () => void this.editors.project(),
      },
      {
        id: 'theme',
        group: 'Actions',
        label: this.theme.resolved() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        icon: this.theme.resolved() === 'dark' ? 'sun' : 'moon',
        run: () => this.theme.toggle(),
      },
      {
        id: 'sign-out',
        group: 'Actions',
        label: 'Sign out',
        icon: 'logout',
        run: () => this.auth.logout(),
      },
    ];

    return [...tasks, ...projects, ...static_.filter((c) => !query || matches(c.label, query))];
  });

  protected readonly activeId = computed(() => {
    const command = this.commands()[this.active()];
    return command ? `cmd-${command.id}` : null;
  });

  protected setQuery(value: string): void {
    this.query.set(value);
    this.active.set(0);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.commands().length;
    if (!count) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.active.update((i) => (i + step + count) % count);
      document.getElementById(this.activeId() ?? '')?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const command = this.commands()[this.active()];
      if (command) this.run(command);
    }
  }

  protected run(command: Command): void {
    this.closed.emit();
    command.run();
  }
}
