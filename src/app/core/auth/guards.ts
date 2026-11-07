import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WorkspaceContext } from '../workspace';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return (
    auth.isAuthenticated() ||
    inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })
  );
};

export const guestGuard: CanActivateFn = () =>
  !inject(AuthService).isAuthenticated() || inject(Router).createUrlTree(['/']);

/**
 * Loads the user's workspaces before the shell renders. A failure does not block navigation:
 * the pages then show their own load error with a retry.
 */
export const workspaceGuard: CanActivateFn = async () => {
  const user = inject(AuthService).user();
  if (user) {
    await inject(WorkspaceContext)
      .load(user.id)
      .catch(() => undefined);
  }
  return true;
};
