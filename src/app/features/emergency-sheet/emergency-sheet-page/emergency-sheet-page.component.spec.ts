import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { EntriesQueries } from '@/app/features/entries/entries.queries';
import type { EntryKind, FolderEntry } from '@/app/features/entries/entry.types';
import type { Helper } from '@/app/features/family/family.types';
import type { Folder } from '@/app/features/folders/folder.types';
import { FoldersQueries } from '@/app/features/folders/folders.queries';
import { MODE_PREPARE } from '@/app/features/onboarding/onboarding.questions';
import { EmergencySheetPage } from './emergency-sheet-page.component';

const FOLDER_ID = 'folder-1';

function folderWith(helpers: Helper[] = []): Folder {
  return {
    id: FOLDER_ID,
    answers: { mode: [MODE_PREPARE] },
    completedTaskIds: [],
    helpers,
    assignments: {},
    createdAt: '2026-08-01T00:00:00Z',
  };
}

function entryWith(kind: EntryKind, overrides: Partial<FolderEntry> = {}): FolderEntry {
  return {
    id: `${kind}-1`,
    folderId: FOLDER_ID,
    kind,
    title: 'Testament',
    detail: '',
    reference: '',
    contact: '',
    sortOrder: 0,
    ...overrides,
  };
}

async function renderSheet(
  entries: FolderEntry[],
  folder: Folder = folderWith(),
): Promise<ComponentFixture<EmergencySheetPage>> {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({ folderId: FOLDER_ID })) },
      },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      {
        provide: FoldersQueries,
        useValue: {
          loadFolder: () => Promise.resolve({ ok: true, data: folder }),
          saveFolderProgress: () => Promise.resolve({ ok: true, data: undefined }),
        },
      },
      {
        provide: EntriesQueries,
        useValue: { listEntries: () => Promise.resolve({ ok: true, data: entries }) },
      },
    ],
  });

  const fixture = TestBed.createComponent(EmergencySheetPage);
  await fixture.whenStable();
  fixture.detectChanges();

  return fixture;
}

function textOf(fixture: ComponentFixture<EmergencySheetPage>, selector: string): string[] {
  return [...fixture.nativeElement.querySelectorAll(selector)].map((node: Element) =>
    (node.textContent ?? '').trim(),
  );
}

describe('EmergencySheetPage', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('offers nothing to print while the register is empty', async () => {
    const fixture = await renderSheet([]);

    expect(fixture.nativeElement.querySelector('.emergency-sheet__blank')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.emergency-sheet__paper')).toBeNull();
  });

  it('puts the filled sections on the sheet and leaves the empty ones off', async () => {
    const fixture = await renderSheet([
      entryWith('location', { reference: 'Bankschließfach Sparkasse' }),
      entryWith('wish', { title: 'Bestattung', detail: 'Seebestattung.' }),
    ]);

    expect(textOf(fixture, '.emergency-sheet__section-title')).toEqual([
      'Wo liegt was',
      'Meine Wünsche',
    ]);
    expect(textOf(fixture, '.emergency-sheet__entry-title')).toEqual(['Testament', 'Bestattung']);
    expect(textOf(fixture, '.emergency-sheet__field-value')).toContain('Bankschließfach Sparkasse');
  });

  it('draws the family tree, so whoever finds the paper sees who belongs to whom', async () => {
    const folder = folderWith([
      { id: 'helper-1', name: 'Anna', relation: 'child', deceased: false },
    ]);
    const fixture = await renderSheet([entryWith('location')], folder);

    expect(textOf(fixture, '.family-tree__name')).toContain('Anna');
    expect(textOf(fixture, '.family-tree__row-label')).toContain('Kinder');
  });

  it('states on the paper itself that it holds no passwords and no documents', async () => {
    const fixture = await renderSheet([entryWith('location')]);

    // A printed sheet outlives the app that made it, so the promise has to travel with it.
    expect(textOf(fixture, '.emergency-sheet__lead')[0]).toContain('keine Passwörter');
    expect(textOf(fixture, '.emergency-sheet__note')[0]).toContain('Ausweispapiere');
  });
});
