import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { PersonRef, Task, WorkspaceActivity } from '../../core/api/models';
import { WorkspacesApi } from '../../core/api/resources';
import { AuthService } from '../../core/auth/auth.service';
import { Changes } from '../../core/changes';
import { WorkspaceContext } from '../../core/workspace';
import { Editors } from '../../shared/editors';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState, LoadError } from '../../shared/ui/feedback';
import { Crumb, Header } from '../../shared/ui/header';
import { Icon } from '../../shared/ui/icon';
import { TaskRow } from '../../shared/ui/task-row';
import { Tooltip } from '../../shared/ui/tooltip';
import { todayIso } from '../../shared/util/dates';
import {
  CalendarDatePipe,
  formatCalendar,
  formatLocal,
  FullNamePipe,
  relativeTime,
} from '../../shared/util/format';
import {
  activityText,
  dueInfo,
  percent,
  PROJECT_STATUS_LABELS,
  taskIdentifier,
} from '../../shared/util/task-text';

interface TaskGroup {
  label: string;
  tone?: 'danger';
  tasks: Task[];
}

/** "Assigned to you", split by urgency; the server already sorts by due date. */
export function groupMyTasks(tasks: Task[], today: string): TaskGroup[] {
  const groups: TaskGroup[] = [
    { label: 'Overdue', tone: 'danger', tasks: [] },
    { label: 'Due this week', tasks: [] },
    { label: 'Later', tasks: [] },
    { label: 'No due date', tasks: [] },
  ];
  for (const task of tasks) {
    const tone = dueInfo(task.dueDate, today, task.status)?.tone;
    const index = tone === 'overdue' ? 0 : tone === 'today' || tone === 'soon' ? 1 : tone ? 2 : 3;
    groups[index]!.tasks.push(task);
  }
  return groups.filter((group) => group.tasks.length);
}

@Component({
  selector: 'app-overview-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Header,
    Icon,
    Avatar,
    Tooltip,
    TaskRow,
    EmptyState,
    LoadError,
    CalendarDatePipe,
    FullNamePipe,
  ],
  templateUrl: './overview.page.html',
  styleUrl: './overview.page.scss',
})
export default class OverviewPage {
  private readonly api = inject(WorkspacesApi);
  private readonly changes = inject(Changes);
  private readonly auth = inject(AuthService);
  protected readonly workspace = inject(WorkspaceContext);
  protected readonly editors = inject(Editors);

  protected readonly today = todayIso();
  protected readonly percent = percent;
  protected readonly identifier = taskIdentifier;
  protected readonly statusLabels = PROJECT_STATUS_LABELS;

  protected readonly overview = rxResource({
    params: () => ({
      id: this.workspace.id(),
      tasks: this.changes.tasks(),
      projects: this.changes.projects(),
    }),
    stream: ({ params: { id } }) => (id ? this.api.overview(id, this.today) : of(null)),
  });

  protected readonly crumbs = computed<Crumb[]>(() => [
    { label: this.workspace.current()?.name ?? 'Overview' },
  ]);

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return `${part}, ${this.auth.user()?.firstName ?? ''}`;
  });
  protected readonly dateLine = formatCalendar(this.today, 'EEEE, d MMMM');

  protected readonly groups = computed(() =>
    groupMyTasks(this.overview.value()?.myTasks ?? [], this.today),
  );

  private readonly people = computed(
    () => new Map<number, PersonRef>(this.workspace.members().map((m) => [m.id, m])),
  );

  protected describe(activity: WorkspaceActivity): string {
    return activityText(activity, this.people());
  }

  protected ago(at: string): string {
    return relativeTime(at);
  }

  protected exact(at: string): string {
    return formatLocal(at, 'd MMM y, HH:mm');
  }
}
