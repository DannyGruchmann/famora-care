import { TestBed } from '@angular/core/testing';
import type { Session, User } from '@supabase/supabase-js';
import { SupabaseService, type FamoraSupabaseClient } from '@/app/lib/supabase.service';
import { AuthService } from './auth.service';

interface SessionResult {
  data: { session: Session | null };
}

type ChangeListener = (event: string, session: Session | null) => void;

function userNamed(id: string): User {
  return { id, user_metadata: { first_name: 'Danny' } } as unknown as User;
}

function sessionFor(user: User): Session {
  return { user } as unknown as Session;
}

/** Minimal stand-in for the parts of the Supabase client the service touches. */
function createClientMock(getSession: () => Promise<SessionResult>) {
  const listeners: ChangeListener[] = [];
  const unsubscribe = vi.fn();

  const client = {
    auth: {
      getSession,
      onAuthStateChange: (listener: ChangeListener) => {
        listeners.push(listener);
        return { data: { subscription: { unsubscribe } } };
      },
    },
  } as unknown as FamoraSupabaseClient;

  const report = (session: Session | null) => {
    for (const listener of listeners) listener('SIGNED_IN', session);
  };

  return { client, report, unsubscribe };
}

function serviceWithClient(client: FamoraSupabaseClient | null): AuthService {
  TestBed.configureTestingModule({
    providers: [{ provide: SupabaseService, useValue: { client } }],
  });

  return TestBed.inject(AuthService);
}

describe('AuthService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('starts out loading until the session is known', () => {
    const { client } = createClientMock(() => new Promise<SessionResult>(() => undefined));

    expect(serviceWithClient(client).status()).toBe('loading');
  });

  it('does not let a late getSession overwrite what onAuthStateChange already reported', async () => {
    let releaseGetSession: (result: SessionResult) => void = () => undefined;
    const pendingSession = new Promise<SessionResult>((resolve) => {
      releaseGetSession = resolve;
    });

    const { client, report } = createClientMock(() => pendingSession);
    const service = serviceWithClient(client);
    const user = userNamed('signed-in-first');

    report(sessionFor(user));
    expect(service.status()).toBe('signed-in');

    // getSession answers afterwards, and with the older truth: no session.
    releaseGetSession({ data: { session: null } });
    await pendingSession;

    expect(service.status()).toBe('signed-in');
    expect(service.user()).toBe(user);
  });

  it('applies getSession when nothing else reported first', async () => {
    const user = userNamed('from-get-session');
    const { client } = createClientMock(() =>
      Promise.resolve({ data: { session: sessionFor(user) } }),
    );

    const service = serviceWithClient(client);
    await service.waitUntilSessionKnown();

    expect(service.status()).toBe('signed-in');
    expect(service.firstName()).toBe('Danny');
  });

  it('follows a later sign-out reported by onAuthStateChange', async () => {
    const { client, report } = createClientMock(() =>
      Promise.resolve({ data: { session: sessionFor(userNamed('signed-in')) } }),
    );

    const service = serviceWithClient(client);
    await service.waitUntilSessionKnown();

    report(null);

    expect(service.status()).toBe('signed-out');
    expect(service.user()).toBeNull();
  });

  it('settles on signed-out instead of hanging when Supabase is not configured', async () => {
    const service = serviceWithClient(null);

    expect(service.status()).toBe('signed-out');
    await expect(service.waitUntilSessionKnown()).resolves.toBeUndefined();
  });

  it('unsubscribes from auth changes when the injector is destroyed', () => {
    const { client, unsubscribe } = createClientMock(() =>
      Promise.resolve({ data: { session: null } }),
    );

    serviceWithClient(client);
    TestBed.resetTestingModule();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
