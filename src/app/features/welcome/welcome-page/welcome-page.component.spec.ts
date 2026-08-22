import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/app/features/auth/auth.service';
import { EntriesQueries } from '@/app/features/entries/entries.queries';
import type { Folder } from '@/app/features/folders/folder.types';
import { FoldersQueries } from '@/app/features/folders/folders.queries';
import { MODE_PREPARE } from '@/app/features/onboarding/onboarding.questions';
import type { ApiResult } from '@/app/lib/supabase-query';
import { WelcomePage } from './welcome-page.component';

type SessionStatus = 'loading' | 'signed-in' | 'signed-out';

function folderWith(id: string): Folder {
  return {
    id,
    answers: { mode: [MODE_PREPARE] },
    completedTaskIds: [],
    helpers: [],
    assignments: {},
    createdAt: '2026-08-01T00:00:00Z',
  };
}

async function renderWelcome(options: {
  sessionStatus?: SessionStatus;
  folders?: ApiResult<Folder[]>;
}): Promise<ComponentFixture<WelcomePage>> {
  const folders = options.folders ?? { ok: true, data: [] };

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          status: signal(options.sessionStatus ?? 'signed-in'),
          firstName: signal('Danny'),
        },
      },
      { provide: FoldersQueries, useValue: { listFolders: () => Promise.resolve(folders) } },
      {
        provide: EntriesQueries,
        useValue: { listFilledKinds: () => Promise.resolve({ ok: true, data: new Map() }) },
      },
    ],
  });

  const fixture = TestBed.createComponent(WelcomePage);
  await fixture.whenStable();
  fixture.detectChanges();

  return fixture;
}

function has(fixture: ComponentFixture<WelcomePage>, selector: string): boolean {
  return fixture.nativeElement.querySelector(selector) !== null;
}

describe('WelcomePage', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('shows the marketing page to a guest', async () => {
    const fixture = await renderWelcome({ sessionStatus: 'signed-out' });

    expect(has(fixture, '.landing-view')).toBe(true);
    expect(has(fixture, '.welcome-page')).toBe(false);
  });

  // Straight after registering there is nothing to overview yet — the two paths still need explaining.
  it('shows the marketing page to an account without a folder', async () => {
    const fixture = await renderWelcome({ folders: { ok: true, data: [] } });

    expect(has(fixture, '.landing-view')).toBe(true);
  });

  it('shows the folders instead once there is one', async () => {
    const fixture = await renderWelcome({
      folders: { ok: true, data: [folderWith('folder-1'), folderWith('folder-2')] },
    });

    expect(has(fixture, '.landing-view')).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('famora-folder-card')).toHaveLength(2);
  });

  it('greets by the name from the registration', async () => {
    const fixture = await renderWelcome({ folders: { ok: true, data: [folderWith('folder-1')] } });

    expect(fixture.nativeElement.querySelector('.welcome-page__title').textContent).toContain(
      'Danny',
    );
  });

  // A failed request must not look like "you have no folders" — that would offer to start over.
  it('says the folders could not be fetched rather than falling back to the marketing page', async () => {
    const fixture = await renderWelcome({ folders: { ok: false, message: 'Keine Verbindung.' } });

    expect(has(fixture, '.landing-view')).toBe(false);
    expect(
      fixture.nativeElement.querySelector('.welcome-page__failure-text').textContent,
    ).toContain('Keine Verbindung.');
  });
});
