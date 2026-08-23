import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { EntriesQueries } from '@/app/features/entries/entries.queries';
import type { Folder } from '@/app/features/folders/folder.types';
import { FoldersQueries } from '@/app/features/folders/folders.queries';
import {
  MODE_AFTER_DEATH,
  MODE_PREPARE,
  OPTION,
} from '@/app/features/onboarding/onboarding.questions';
import type { OnboardingAnswers } from '@/app/features/onboarding/onboarding.types';
import { DashboardPage } from './dashboard-page.component';

const FOLDER_ID = 'folder-1';

const PREPARE_ANSWERS: OnboardingAnswers = {
  mode: [MODE_PREPARE],
  'prepare-focus': [OPTION.focusDocuments],
};

const AFTER_DEATH_ANSWERS: OnboardingAnswers = {
  mode: [MODE_AFTER_DEATH],
  relation: [OPTION.relPartner],
};

function folderWith(answers: OnboardingAnswers): Folder {
  return {
    id: FOLDER_ID,
    answers,
    completedTaskIds: [],
    helpers: [],
    assignments: {},
    createdAt: '2026-08-01T00:00:00Z',
  };
}

async function renderDashboard(
  answers: OnboardingAnswers,
): Promise<ComponentFixture<DashboardPage>> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({ folderId: FOLDER_ID })) },
      },
      {
        provide: FoldersQueries,
        useValue: {
          loadFolder: () => Promise.resolve({ ok: true, data: folderWith(answers) }),
          saveFolderProgress: () => Promise.resolve({ ok: true, data: undefined }),
        },
      },
      {
        provide: EntriesQueries,
        useValue: { listEntries: () => Promise.resolve({ ok: true, data: [] }) },
      },
    ],
  });

  const fixture = TestBed.createComponent(DashboardPage);
  await fixture.whenStable();
  fixture.detectChanges();

  return fixture;
}

describe('DashboardPage', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // The palette hangs off the host so that the confirmation dialog and the failure screen are
  // repainted too — both sit outside .dashboard-page.
  it('repaints the whole page for a precaution folder', async () => {
    const fixture = await renderDashboard(PREPARE_ANSWERS);

    expect(fixture.nativeElement.classList.contains('dashboard-page--prepare')).toBe(true);
  });

  it('leaves an after-death folder in the brand colour', async () => {
    const fixture = await renderDashboard(AFTER_DEATH_ANSWERS);

    expect(fixture.nativeElement.classList.contains('dashboard-page--prepare')).toBe(false);
  });

  it('shows the register only on the precaution path', async () => {
    const fixture = await renderDashboard(PREPARE_ANSWERS);

    expect(fixture.nativeElement.querySelector('famora-entries-panel')).not.toBeNull();
  });

  it('leaves the register out after a death — there is nothing to write down', async () => {
    const fixture = await renderDashboard(AFTER_DEATH_ANSWERS);

    expect(fixture.nativeElement.querySelector('famora-entries-panel')).toBeNull();
  });
});
