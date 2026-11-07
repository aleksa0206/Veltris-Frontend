import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { apiUrl } from '../api/http';
import { AuthService } from './auth.service';
import { authGuard } from './guards';

describe('guards', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  function signIn(): void {
    TestBed.inject(AuthService).login('a@b.rs', 'x').subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne(apiUrl('/auth/login'))
      .flush({ token: 't', user: { id: 1, firstName: 'A', lastName: 'B' } });
  }

  function run(guard: typeof authGuard, url = '/contacts'): boolean | UrlTree {
    return TestBed.runInInjectionContext(
      () =>
        guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot) as boolean | UrlTree,
    );
  }

  function serialize(result: boolean | UrlTree): string | boolean {
    return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;
  }

  it('authGuard sends a signed-out user to sign in and remembers where they were going', () => {
    expect(serialize(run(authGuard, '/contacts?search=ana'))).toBe(
      '/login?returnUrl=%2Fcontacts%3Fsearch%3Dana',
    );
  });

  it('authGuard lets a signed-in user through', () => {
    signIn();
    expect(run(authGuard)).toBe(true);
  });
});
