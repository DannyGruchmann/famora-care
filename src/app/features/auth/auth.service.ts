import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import type { AuthChangeEvent, User } from '@supabase/supabase-js';
import { SupabaseService, type FamoraSupabaseClient } from '@/app/lib/supabase.service';
import { readLinkError } from './auth.link-errors';
import type { AuthState } from './auth.types';

const LOADING: AuthState = { status: 'loading', user: null };
const SIGNED_OUT: AuthState = { status: 'signed-out', user: null };

function toState(user: User | null): AuthState {
  return user === null ? SIGNED_OUT : { status: 'signed-in', user };
}

/** What GoTrue appends to the address of a password-reset link. */
const RECOVERY_MARKER = 'type=recovery';

/**
 * Read before the Supabase client has cleaned the address up. The PASSWORD_RECOVERY event says
 * the same thing, but arrives a tick later — the guards decide earlier than that.
 */
function arrivedFromRecoveryLink(): boolean {
  return window.location.hash.includes(RECOVERY_MARKER);
}

/** The first name from registration. Empty while nobody is signed in. */
function firstNameOf(user: User | null): string {
  const value: unknown = user?.user_metadata['first_name'];

  return typeof value === 'string' ? value : '';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = signal<AuthState>(LOADING);

  private readonly recovering = signal(arrivedFromRecoveryLink());

  readonly status = computed(() => this.state().status);
  readonly user = computed(() => this.state().user);
  readonly firstName = computed(() => firstNameOf(this.state().user));
  /** True while the session comes from a reset link and no new password has been saved yet. */
  readonly isRecoveringPassword = this.recovering.asReadonly();

  /**
   * Why a link was refused, for whoever arrived through one. Read here rather than in the page,
   * because every field initialiser runs before the Supabase client can clear the fragment — a
   * component looking later finds an empty address.
   */
  readonly linkError = readLinkError(window.location.hash);

  private markSessionKnown: () => void = () => undefined;

  /** Guards must not decide while the status is still "loading" — they await this first. */
  private readonly sessionKnown = new Promise<void>((resolve) => {
    this.markSessionKnown = resolve;
  });

  constructor() {
    this.startTrackingSession();
  }

  async waitUntilSessionKnown(): Promise<void> {
    await this.sessionKnown;
  }

  private startTrackingSession(): void {
    const client = this.supabase.client;

    // Without configuration there is no session — but the app still has to run, otherwise it
    // hangs in the loading state forever.
    if (client === null) {
      this.setState(SIGNED_OUT);
      return;
    }

    void client.auth.getSession().then(({ data }) => {
      this.applyInitialSession(data.session?.user ?? null);
    });

    this.subscribeToAuthChanges(client);
  }

  private subscribeToAuthChanges(client: FamoraSupabaseClient): void {
    const { data } = client.auth.onAuthStateChange((event, session) => {
      this.trackRecovery(event);
      this.setState(toState(session?.user ?? null));
    });

    this.destroyRef.onDestroy(() => data.subscription.unsubscribe());
  }

  /**
   * A session from a reset link is signed in like any other — only the event tells them apart.
   * USER_UPDATED arrives once the new password is saved, which is what ends the recovery.
   */
  private trackRecovery(event: AuthChangeEvent): void {
    if (event === 'PASSWORD_RECOVERY') this.recovering.set(true);
    if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') this.recovering.set(false);
  }

  /**
   * Only applied while nothing is known yet: onAuthStateChange may report earlier, and its state
   * is the newer one in that case.
   */
  private applyInitialSession(user: User | null): void {
    if (this.state().status !== 'loading') return;
    this.setState(toState(user));
  }

  private setState(next: AuthState): void {
    this.state.set(next);
    if (next.status !== 'loading') this.markSessionKnown();
  }
}
