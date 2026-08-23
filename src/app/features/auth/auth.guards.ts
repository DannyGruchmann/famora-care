import { inject } from '@angular/core';
import { Router, type ActivatedRouteSnapshot, type CanActivateFn } from '@angular/router';
import { REDIRECT_PARAM, ROUTES } from '@/app/routes.constants';
import { AuthService } from './auth.service';

function readRedirectTarget(route: ActivatedRouteSnapshot): string {
  const configured: unknown = route.data['redirectTo'];

  return typeof configured === 'string' ? configured : ROUTES.dashboard;
}

/**
 * Everything that belongs to an account. Nothing is decided while the status is unknown — waiting
 * it out is what keeps a reload from briefly throwing everyone out.
 *
 * Both guards inject before the first await on purpose: Angular's injection context only exists
 * synchronously, and any inject() after an await would throw.
 */
export const requireAuthGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.waitUntilSessionKnown();
  if (auth.status() === 'signed-in') return true;

  // The destination travels along, so signing in afterwards does not lead nowhere.
  return router.createUrlTree([ROUTES.login], {
    queryParams: { [REDIRECT_PARAM]: state.url },
  });
};

/**
 * Sign-in and registration. Anyone already signed in has no business here and would otherwise
 * stand in front of a form they no longer need.
 *
 * The redirect target is configurable per route and not just cosmetic: creating an account signs
 * the user in immediately, and this guard then fires while the registration page is still up.
 * Without its own target it would overtake the form's own redirect — and which race wins would
 * depend on the order of two state changes.
 */
export const guestOnlyGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const redirectTo = readRedirectTarget(route);

  await auth.waitUntilSessionKnown();
  if (auth.status() === 'signed-out') return true;

  // A reset link signs its owner in before they set anything — sending them on to the dashboard
  // would skip exactly the form they clicked the link for.
  if (auth.isRecoveringPassword()) return router.parseUrl(ROUTES.resetPassword);

  return router.parseUrl(redirectTo);
};
