import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { Activity, Comment, PersonRef } from '../../core/api/models';
import { TasksApi } from '../../core/api/resources';
import { AuthService } from '../../core/auth/auth.service';
import { Changes } from '../../core/changes';
import { WorkspaceContext } from '../../core/workspace';
import { Avatar } from '../../shared/ui/avatar';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { Icon } from '../../shared/ui/icon';
import { ToastService } from '../../shared/ui/toast';
import { Tooltip } from '../../shared/ui/tooltip';
import { formatLocal, FullNamePipe, relativeTime } from '../../shared/util/format';
import { activityText } from '../../shared/util/task-text';

type Entry =
  | { kind: 'comment'; at: string; comment: Comment }
  | { kind: 'event'; at: string; activity: Activity };

/** Comments and the change history of a task, oldest first, with the composer at the end. */
@Component({
  selector: 'app-task-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar, Icon, Tooltip, FullNamePipe],
  template: `
    <section aria-labelledby="activity-heading">
      <h2 class="heading" id="activity-heading">Activity</h2>
      <ol class="timeline">
        @for (
          entry of entries();
          track entry.kind + (entry.kind === 'comment' ? entry.comment.id : entry.activity.id)
        ) {
          @if (entry.kind === 'comment') {
            <li class="comment">
              <app-avatar [person]="entry.comment.author" [size]="24" />
              <div class="comment__card">
                <p class="comment__meta">
                  <strong>{{ entry.comment.author | fullName }}</strong>
                  <time [attr.datetime]="entry.at" [appTooltip]="exact(entry.at)">{{
                    ago(entry.at)
                  }}</time>
                  @if (canDelete(entry.comment)) {
                    <button
                      type="button"
                      class="btn btn--ghost btn--icon btn--sm comment__delete"
                      aria-label="Delete comment"
                      (click)="deleteComment(entry.comment)"
                    >
                      <app-icon name="trash" [size]="14" />
                    </button>
                  }
                </p>
                <p class="comment__body">{{ entry.comment.body }}</p>
              </div>
            </li>
          } @else {
            <li class="event">
              <span class="event__dot" aria-hidden="true"></span>
              <p>
                <span class="event__actor">{{ entry.activity.actor | fullName }}</span>
                {{ describe(entry.activity) }}
                <time [attr.datetime]="entry.at" [appTooltip]="exact(entry.at)"
                  >· {{ ago(entry.at) }}</time
                >
              </p>
            </li>
          }
        }
      </ol>

      <form class="composer" (submit)="$event.preventDefault(); submit()">
        @if (auth.user(); as me) {
          <app-avatar [person]="me" [size]="24" />
        }
        <div class="composer__box">
          <label class="visually-hidden" for="comment-{{ taskId() }}">Comment</label>
          <textarea
            #box
            id="comment-{{ taskId() }}"
            placeholder="Leave a comment…"
            [value]="draft()"
            (input)="draft.set(box.value)"
            (keydown.control.enter)="submit()"
            (keydown.meta.enter)="submit()"
          ></textarea>
          <div class="composer__actions">
            <span class="text-meta">Ctrl + Enter to send</span>
            <button
              type="submit"
              class="btn btn--primary btn--sm"
              [disabled]="!draft().trim() || sending()"
            >
              Comment
            </button>
          </div>
        </div>
      </form>
    </section>
  `,
  styleUrl: './task-timeline.scss',
})
export class TaskTimeline {
  readonly taskId = input.required<number>();

  private readonly api = inject(TasksApi);
  private readonly changes = inject(Changes);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly workspace = inject(WorkspaceContext);
  protected readonly auth = inject(AuthService);

  protected readonly draft = signal('');
  protected readonly sending = signal(false);

  private readonly comments = rxResource({
    params: () => ({ id: this.taskId(), version: this.changes.tasks() }),
    stream: ({ params: { id } }) => this.api.comments(id),
  });
  private readonly activity = rxResource({
    params: () => ({ id: this.taskId(), version: this.changes.tasks() }),
    stream: ({ params: { id } }) => this.api.activity(id),
  });

  private readonly people = computed(
    () => new Map<number, PersonRef>(this.workspace.members().map((m) => [m.id, m])),
  );

  protected readonly entries = computed<Entry[]>(() => {
    const comments: Entry[] = (this.comments.value() ?? []).map((comment) => ({
      kind: 'comment',
      at: comment.createdAt,
      comment,
    }));
    // A comment already shows itself; its "commented" history entry would only repeat it.
    const events: Entry[] = (this.activity.value() ?? [])
      .filter((activity) => activity.type !== 'Commented')
      .map((activity) => ({ kind: 'event', at: activity.createdAt, activity }));
    return [...events, ...comments].sort((a, b) => a.at.localeCompare(b.at));
  });

  protected describe(activity: Activity): string {
    return activityText(activity, this.people());
  }

  protected ago(at: string): string {
    return relativeTime(at);
  }

  protected exact(at: string): string {
    return formatLocal(at, 'd MMM y, HH:mm');
  }

  protected canDelete(comment: Comment): boolean {
    return comment.author.id === this.auth.user()?.id || this.workspace.canManage();
  }

  protected submit(): void {
    const body = this.draft().trim();
    if (!body || this.sending()) return;
    this.sending.set(true);
    this.api
      .addComment(this.taskId(), body)
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: () => {
          this.draft.set('');
          this.changes.notify('tasks');
        },
        error: (err: unknown) => this.toast.error(toApiError(err).message),
      });
  }

  protected async deleteComment(comment: Comment): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Delete comment?',
      message: 'The comment will be removed for everyone. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.removeComment(comment.id).subscribe({
      next: () => this.changes.notify('tasks'),
      error: (err: unknown) => this.toast.error(toApiError(err).message),
    });
  }
}
