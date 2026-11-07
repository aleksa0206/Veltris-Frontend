import { CdkMenu, CdkMenuItem, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProjectsApi } from '../core/api/resources';
import { AuthService } from '../core/auth/auth.service';
import { Changes } from '../core/changes';
import { ThemePreference, ThemeService } from '../core/theme';
import { WorkspaceContext } from '../core/workspace';
import { Editors } from '../shared/editors';
import { Avatar } from '../shared/ui/avatar';
import { Icon, IconName } from '../shared/ui/icon';
import { FullNamePipe } from '../shared/util/format';
import { ROLE_LABELS } from '../shared/util/task-text';
import { CommandPalette } from './command-palette';
import { ShellState } from './shell-state';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { label: 'Overview', path: '/', icon: 'home', exact: true },
  { label: 'Projects', path: '/projects', icon: 'folder', exact: true },
  { label: 'Members', path: '/members', icon: 'users', exact: true },
];

const THEMES: Array<{ value: ThemePreference; label: string; icon: IconName }> = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' },
];

/** Sidebar projects: active work only, so the list stays short. */
const SIDEBAR_PROJECTS = 12;

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CdkMenu,
    CdkMenuItem,
    CdkMenuItemRadio,
    CdkMenuTrigger,
    Icon,
    Avatar,
    FullNamePipe,
    CommandPalette,
  ],
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  protected readonly auth = inject(AuthService);
  protected readonly workspace = inject(WorkspaceContext);
  protected readonly theme = inject(ThemeService);
  protected readonly shell = inject(ShellState);
  protected readonly editors = inject(Editors);
  private readonly projectsApi = inject(ProjectsApi);
  private readonly changes = inject(Changes);
  private readonly router = inject(Router);

  protected readonly nav = NAV;
  protected readonly themes = THEMES;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly isMac = /Mac|iPhone|iPad/.test(navigator.platform);

  protected readonly projects = rxResource({
    params: () => ({ id: this.workspace.id(), version: this.changes.projects() }),
    stream: ({ params: { id } }) =>
      id
        ? this.projectsApi.list(id, { status: 'Active', sort: 'name', limit: SIDEBAR_PROJECTS })
        : of(null),
  });
  protected readonly projectList = computed(() => this.projects.value()?.data ?? []);

  constructor() {
    // The drawer closes once the user has picked a destination.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.shell.navOpen.set(false));
  }

  protected switchWorkspace(id: number): void {
    this.workspace.select(id);
    void this.router.navigateByUrl('/');
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.shell.paletteOpen.update((open) => !open);
    }
  }
}
