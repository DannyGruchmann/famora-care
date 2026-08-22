import type { Routes } from '@angular/router';
import { guestOnlyGuard, requireAuthGuard } from '@/app/features/auth/auth.guards';
import { ROUTES } from '@/app/routes.constants';

/**
 * Paths are declared without their leading slash here — ROUTES carries the absolute form used for
 * navigation, this table needs the relative one.
 */
function pathOf(route: string): string {
  return route.replace(/^\//, '');
}

export const routes: Routes = [
  {
    path: pathOf(ROUTES.login),
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('@/app/features/auth/login-page/login-page.component').then((m) => m.LoginPage),
  },
  {
    // After creating the account it continues to the welcome page. The guard points at the same
    // target, so both routes lead there.
    path: pathOf(ROUTES.register),
    canActivate: [guestOnlyGuard],
    data: { redirectTo: ROUTES.landing },
    loadComponent: () =>
      import('@/app/features/auth/register-page/register-page.component').then(
        (m) => m.RegisterPage,
      ),
  },
  {
    path: pathOf(ROUTES.forgotPassword),
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('@/app/features/auth/forgot-password-page/forgot-password-page.component').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    // No guard: the session from the email link counts as signed in, and an expired link should
    // be explained here rather than navigated away from.
    path: pathOf(ROUTES.resetPassword),
    loadComponent: () =>
      import('@/app/features/auth/reset-password-page/reset-password-page.component').then(
        (m) => m.ResetPasswordPage,
      ),
  },
  {
    // No guard: the page shows the marketing view or the folder overview, depending on who asks.
    path: pathOf(ROUTES.landing),
    loadComponent: () =>
      import('@/app/features/welcome/welcome-page/welcome-page.component').then(
        (m) => m.WelcomePage,
      ),
  },
  {
    path: pathOf(ROUTES.onboarding),
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('@/app/features/onboarding/onboarding-page/onboarding-page.component').then(
        (m) => m.OnboardingPage,
      ),
  },
  {
    // No view of its own: leads to the most recently created folder. The address appears in old
    // links and is the destination after signing in.
    path: pathOf(ROUTES.dashboard),
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('@/app/features/folders/folder-redirect/folder-redirect.component').then(
        (m) => m.FolderRedirect,
      ),
  },
  {
    // Ahead of the folder route: a route without children has to consume the whole address, so
    // the two cannot collide — but the specific one reading first says what is going on.
    path: pathOf(ROUTES.emergencySheet),
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('@/app/features/emergency-sheet/emergency-sheet-page/emergency-sheet-page.component').then(
        (m) => m.EmergencySheetPage,
      ),
  },
  {
    path: pathOf(ROUTES.folder),
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('@/app/features/dashboard/dashboard-page/dashboard-page.component').then(
        (m) => m.DashboardPage,
      ),
  },
  // Imprint and privacy policy stay open — § 5 DDG requires it.
  {
    path: pathOf(ROUTES.imprint),
    loadComponent: () =>
      import('@/app/features/legal/imprint-page/imprint-page.component').then((m) => m.ImprintPage),
  },
  {
    path: pathOf(ROUTES.privacy),
    loadComponent: () =>
      import('@/app/features/legal/privacy-page/privacy-page.component').then((m) => m.PrivacyPage),
  },
  {
    path: '**',
    loadComponent: () =>
      import('@/app/features/not-found/not-found-page/not-found-page.component').then(
        (m) => m.NotFoundPage,
      ),
  },
];
