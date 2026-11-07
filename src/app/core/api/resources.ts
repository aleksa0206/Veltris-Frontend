import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, Observable, reduce } from 'rxjs';
import { apiUrl, toParams } from './http';
import {
  Activity,
  Comment,
  InvitationPreview,
  Member,
  Overview,
  Paged,
  PendingInvitation,
  ProjectStatus,
  ProjectWithCounts,
  Project,
  Task,
  TaskDetail,
  TaskPriority,
  TaskStatus,
  User,
  Workspace,
  WorkspaceSummary,
} from './models';

// One service per backend resource. Components never build URLs themselves.

const MAX_PAGE_SIZE = 100;

/** Every page of a list (a whole board, lookups). */
function fetchAll<T>(fetchPage: (page: number) => Observable<Paged<T>>): Observable<T[]> {
  return fetchPage(1).pipe(
    expand((res) => (res.meta.page < res.meta.totalPages ? fetchPage(res.meta.page + 1) : EMPTY)),
    reduce<Paged<T>, T[]>((all, res) => all.concat(res.data), []),
  );
}

export type PageParams = { page?: number | undefined; limit?: number | undefined };

@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);

  update(body: Partial<Pick<User, 'firstName' | 'lastName' | 'email'>>): Observable<User> {
    return this.http.put<User>(apiUrl('/users/me'), body);
  }
}

@Injectable({ providedIn: 'root' })
export class WorkspacesApi {
  private readonly http = inject(HttpClient);

  mine(): Observable<WorkspaceSummary[]> {
    return this.http.get<WorkspaceSummary[]>(apiUrl('/workspaces'));
  }
  get(id: number): Observable<Workspace> {
    return this.http.get<Workspace>(apiUrl(`/workspaces/${id}`));
  }
  create(name: string): Observable<Workspace> {
    return this.http.post<Workspace>(apiUrl('/workspaces'), { name });
  }
  /** An existing account is added at once; anyone else gets an invitation email. */
  invite(
    id: number,
    body: { email: string; role: AssignableRole },
  ): Observable<{ outcome: 'added' | 'invited' }> {
    return this.http.post<{ outcome: 'added' | 'invited' }>(
      apiUrl(`/workspaces/${id}/members`),
      body,
    );
  }
  changeRole(id: number, userId: number, role: AssignableRole): Observable<Member[]> {
    return this.http.put<Member[]>(apiUrl(`/workspaces/${id}/members/${userId}`), { role });
  }
  /** Removes a member, or leaves the workspace when `userId` is the caller. */
  removeMember(id: number, userId: number): Observable<{ unassignedTasks: number }> {
    return this.http.delete<{ unassignedTasks: number }>(
      apiUrl(`/workspaces/${id}/members/${userId}`),
    );
  }
  invitations(id: number): Observable<PendingInvitation[]> {
    return this.http.get<PendingInvitation[]>(apiUrl(`/workspaces/${id}/invitations`));
  }
  revokeInvitation(id: number, invitationId: number): Observable<unknown> {
    return this.http.delete(apiUrl(`/workspaces/${id}/invitations/${invitationId}`));
  }
  /** `today` is the user's calendar day (`YYYY-MM-DD`). */
  overview(id: number, today: string): Observable<Overview> {
    return this.http.get<Overview>(apiUrl(`/workspaces/${id}/overview`), {
      params: toParams({ today }),
    });
  }
}

export type ProjectSort = 'name' | 'targetDate' | 'updated';

export type ProjectQuery = PageParams & {
  /** Comma-separated, e.g. `Active,OnHold`. */
  status?: string | undefined;
  search?: string | undefined;
  sort?: ProjectSort | undefined;
  today?: string | undefined;
};

export type ProjectInput = {
  key: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  leadId: number | null;
  startDate: string | null;
  targetDate: string | null;
};

@Injectable({ providedIn: 'root' })
export class ProjectsApi {
  private readonly http = inject(HttpClient);

  list(workspaceId: number, query: ProjectQuery): Observable<Paged<ProjectWithCounts>> {
    return this.http.get<Paged<ProjectWithCounts>>(apiUrl(`/workspaces/${workspaceId}/projects`), {
      params: toParams(query),
    });
  }
  get(id: number, today: string): Observable<ProjectWithCounts> {
    return this.http.get<ProjectWithCounts>(apiUrl(`/projects/${id}`), {
      params: toParams({ today }),
    });
  }
  create(workspaceId: number, body: ProjectInput): Observable<Project> {
    return this.http.post<Project>(apiUrl(`/workspaces/${workspaceId}/projects`), body);
  }
  update(id: number, body: Partial<ProjectInput>): Observable<Project> {
    return this.http.put<Project>(apiUrl(`/projects/${id}`), body);
  }
  remove(id: number): Observable<unknown> {
    return this.http.delete(apiUrl(`/projects/${id}`));
  }
}

export type TaskSort = 'board' | 'due' | 'priority' | 'updated';

export type TaskQuery = PageParams & {
  status?: string | undefined;
  priority?: string | undefined;
  /** `me`, `none` or a user id. */
  assigneeId?: string | number | undefined;
  open?: boolean | undefined;
  topLevel?: boolean | undefined;
  /** Title text, or an identifier such as `WEB-12`. */
  search?: string | undefined;
  sort?: TaskSort | undefined;
};

export type TaskInput = {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: number | null;
  dueDate: string | null;
};

@Injectable({ providedIn: 'root' })
export class TasksApi {
  private readonly http = inject(HttpClient);

  listForProject(projectId: number, query: TaskQuery): Observable<Paged<Task>> {
    return this.http.get<Paged<Task>>(apiUrl(`/projects/${projectId}/tasks`), {
      params: toParams(query),
    });
  }
  /** Every card of a project, in board order. */
  board(projectId: number): Observable<Task[]> {
    return fetchAll((page) =>
      this.listForProject(projectId, { sort: 'board', page, limit: MAX_PAGE_SIZE }),
    );
  }
  search(workspaceId: number, query: TaskQuery): Observable<Paged<Task>> {
    return this.http.get<Paged<Task>>(apiUrl(`/workspaces/${workspaceId}/tasks`), {
      params: toParams(query),
    });
  }
  get(id: number): Observable<TaskDetail> {
    return this.http.get<TaskDetail>(apiUrl(`/tasks/${id}`));
  }
  create(
    projectId: number,
    body: Partial<TaskInput> & { title: string; parentId?: number | null },
  ): Observable<TaskDetail> {
    return this.http.post<TaskDetail>(apiUrl(`/projects/${projectId}/tasks`), body);
  }
  update(id: number, body: Partial<TaskInput>): Observable<TaskDetail> {
    return this.http.put<TaskDetail>(apiUrl(`/tasks/${id}`), body);
  }
  /** Drops the card above `beforeTaskId`, or at the bottom of the column when null. */
  move(id: number, status: TaskStatus, beforeTaskId: number | null): Observable<TaskDetail> {
    return this.http.post<TaskDetail>(apiUrl(`/tasks/${id}/move`), { status, beforeTaskId });
  }
  remove(id: number): Observable<unknown> {
    return this.http.delete(apiUrl(`/tasks/${id}`));
  }
  comments(id: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(apiUrl(`/tasks/${id}/comments`));
  }
  addComment(id: number, body: string): Observable<Comment> {
    return this.http.post<Comment>(apiUrl(`/tasks/${id}/comments`), { body });
  }
  removeComment(commentId: number): Observable<unknown> {
    return this.http.delete(apiUrl(`/comments/${commentId}`));
  }
  activity(id: number): Observable<Activity[]> {
    return this.http.get<Activity[]>(apiUrl(`/tasks/${id}/activity`));
  }
}

export type AssignableRole = 'Admin' | 'Member';

@Injectable({ providedIn: 'root' })
export class InvitationsApi {
  private readonly http = inject(HttpClient);

  /** Public: anyone holding the link can see who invited them where. */
  preview(token: string): Observable<InvitationPreview> {
    return this.http.post<InvitationPreview>(apiUrl('/invitations/preview'), { token });
  }
  accept(token: string): Observable<{ workspaceId: number }> {
    return this.http.post<{ workspaceId: number }>(apiUrl('/invitations/accept'), { token });
  }
}
