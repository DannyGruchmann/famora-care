import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import type { User } from '@supabase/supabase-js';
import { SupabaseService, type FamoraSupabaseClient } from '@/app/lib/supabase.service';
import type { AuthState } from './auth.types';

const LOADING: AuthState = { status: 'loading', user: null };
const SIGNED_OUT: AuthState = { status: 'signed-out', user: null };

function toState(user: User | null): AuthState {
  return user === null ? SIGNED_OUT : { status: 'signed-in', user };
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

  readonly status = computed(() => this.state().status);
  readonly user = computed(() => this.state().user);
  readonly firstName = computed(() => firstNameOf(this.state().user));

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
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      this.setState(toState(session?.user ?? null));
    });

    this.destroyRef.onDestroy(() => data.subscription.unsubscribe());
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
