import { CanActivateFn, Route, Routes } from '@angular/router';
import { authGuard, guestGuard, workspaceGuard } from './core/auth/guards';
import { AppShell } from './layout/app-shell';
import { AuthLayout } from './layout/auth-layout';
import { ForbiddenPage, NotFoundPage } from './layout/system-pages';

// Each auth page gets its own path with the layout. Grouping them under `path: ''` would
// also match "/" (an empty layout with no page) before the router reaches the shell.
function authPage(
  path: string,
  title: string,
  loadComponent: Route['loadComponent'],
  guards: CanActivateFn[] = [],
): Route {
  return {
    path,
    component: AuthLayout,
    canActivate: guards,
    children: [{ path: '', title, loadComponent }],
  };
}

export const routes: Routes = [
  authPage('login', 'Sign in', () => import('./features/auth/login.page'), [guestGuard]),
  authPage('register', 'Create an account', () => import('./features/auth/register.page'), [
    guestGuard,
  ]),
  authPage(
    'forgot-password',
    'Forgot password',
    () => import('./features/auth/forgot-password.page'),
    [guestGuard],
  ),
  // This path must stay as is: the backend embeds it in the email (FRONTEND_URL/reset-password?token=...).
  authPage('reset-password', 'New password', () => import('./features/auth/reset-password.page')),
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard, workspaceGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Overview',
        loadComponent: () => import('./features/overview/overview.page'),
      },
      {
        path: 'projects',
        title: 'Projects',
        loadComponent: () => import('./features/projects/projects.page'),
      },
      {
        // ?task=<id> opens that task in the side panel over the board.
        path: 'projects/:projectId',
        title: 'Board',
        loadComponent: () => import('./features/board/board.page'),
      },
      {
        path: 'tasks/:taskId',
        title: 'Task',
        loadComponent: () => import('./features/tasks/task.page'),
      },
      {
        path: 'account',
        title: 'Account',
        loadComponent: () => import('./features/account/account.page'),
      },
      { path: 'forbidden', title: 'Access denied', component: ForbiddenPage },
      { path: '**', title: 'Page not found', component: NotFoundPage },
    ],
  },
];
