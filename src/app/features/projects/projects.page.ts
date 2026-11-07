import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { ProjectStatus, ProjectWithCounts } from '../../core/api/models';
import { ProjectSort, ProjectsApi } from '../../core/api/resources';
import { Changes } from '../../core/changes';
import { WorkspaceContext } from '../../core/workspace';
import { Editors } from '../../shared/editors';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState, LoadError, SkeletonRows } from '../../shared/ui/feedback';
import { Crumb, Header } from '../../shared/ui/header';
import { Icon } from '../../shared/ui/icon';
import { Pagination } from '../../shared/ui/pagination';
import { SearchInput } from '../../shared/ui/search-input';
import { todayIso } from '../../shared/util/dates';
import { CalendarDatePipe, FullNamePipe } from '../../shared/util/format';
import { parseOption, parsePage } from '../../shared/util/query';
import { percent, PROJECT_STATUS_LABELS } from '../../shared/util/task-text';

const VIEWS = ['current', 'Active', 'OnHold', 'Completed', 'Archived', 'all'] as const;
type View = (typeof VIEWS)[number];

const VIEW_LABELS: Record<View, string> = {
  current: 'Current',
  Active: 'Active',
  OnHold: 'On hold',
  Completed: 'Completed',
  Archived: 'Archived',
  all: 'All',
};

const VIEW_STATUS: Record<View, string | undefined> = {
  current: 'Active,OnHold',
  Active: 'Active',
  OnHold: 'OnHold',
  Completed: 'Completed',
  Archived: 'Archived',
  all: undefined,
};

const SORTS = ['name', 'targetDate', 'updated'] as const;
const PAGE_SIZE = 25;

@Component({
  selector: 'app-projects-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    Header,
    Icon,
    Avatar,
    EmptyState,
    LoadError,
    SkeletonRows,
    Pagination,
    SearchInput,
    CalendarDatePipe,
    FullNamePipe,
  ],
  templateUrl: './projects.page.html',
  styleUrl: './projects.page.scss',
})
export default class ProjectsPage {
  private readonly api = inject(ProjectsApi);
  private readonly router = inject(Router);
  private readonly changes = inject(Changes);
  protected readonly workspace = inject(WorkspaceContext);
  protected readonly editors = inject(Editors);

  // Query params from the URL.
  readonly view = input<string>();
  readonly search = input<string>();
  readonly sort = input<string>();
  readonly page = input<string>();

  protected readonly views = VIEWS;
  protected readonly viewLabels = VIEW_LABELS;
  protected readonly statusLabels = PROJECT_STATUS_LABELS;
  protected readonly percent = percent;
  protected readonly today = todayIso();

  protected readonly activeView = computed(() => parseOption(this.view(), VIEWS) ?? 'current');
  protected readonly activeSort = computed<ProjectSort>(
    () => parseOption(this.sort(), SORTS) ?? 'name',
  );

  protected readonly crumbs = computed<Crumb[]>(() => [
    { label: this.workspace.current()?.name ?? 'Workspace', link: '/' },
    { label: 'Projects' },
  ]);

  protected readonly projects = rxResource({
    params: () => ({
      workspaceId: this.workspace.id(),
      status: VIEW_STATUS[this.activeView()],
      search: this.search() || undefined,
      sort: this.activeSort(),
      page: parsePage(this.page()),
      version: this.changes.projects(),
    }),
    stream: ({ params: { workspaceId, version: _version, ...query } }) =>
      workspaceId
        ? this.api.list(workspaceId, { ...query, limit: PAGE_SIZE, today: this.today })
        : of(null),
  });

  protected isLate(project: ProjectWithCounts): boolean {
    return (
      !!project.targetDate &&
      project.targetDate.slice(0, 10) < this.today &&
      project.status !== 'Completed' &&
      project.status !== 'Archived'
    );
  }

  protected statusClass(status: ProjectStatus): string {
    return `project-status project-status--${status.toLowerCase()}`;
  }

  /** Changing any filter goes back to the first page. */
  protected update(params: Record<string, string | number | null>, resetPage = true): void {
    void this.router.navigate([], {
      queryParams: resetPage ? { ...params, page: null } : params,
      queryParamsHandling: 'merge',
    });
  }

  protected open(project: ProjectWithCounts, event: MouseEvent): void {
    // Rows are clickable as a whole; links and buttons inside keep their own behaviour.
    if ((event.target as HTMLElement).closest('a, button')) return;
    void this.router.navigate(['/projects', project.id]);
  }
}
