import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { EntriesQueries } from '../entries.queries';
import { EntriesStore } from '../entries.store';
import { EntriesPanel } from './entries-panel.component';
import type { EntryDraft, EntryKind } from '../entry.types';

/** The panel expects a store from its page, so the test brings a page of its own. */
@Component({
  imports: [EntriesPanel],
  providers: [EntriesStore],
  template: '<famora-entries-panel hint="Was hier steht, findet Ihre Familie wieder." />',
})
class HostPage {}

function createEntry(folderId: string, kind: EntryKind, draft: EntryDraft, sortOrder: number) {
  return Promise.resolve({
    ok: true as const,
    data: { id: 'created-1', folderId, kind, sortOrder, ...draft },
  });
}

async function renderPanel(): Promise<{
  fixture: ComponentFixture<HostPage>;
  create: ReturnType<typeof vi.fn>;
}> {
  const create = vi.fn(createEntry);

  TestBed.configureTestingModule({
    providers: [
      {
        provide: EntriesQueries,
        useValue: {
          listEntries: () => Promise.resolve({ ok: true, data: [] }),
          createEntry: create,
          updateEntry: () => Promise.resolve({ ok: true, data: undefined }),
          deleteEntry: () => Promise.resolve({ ok: true, data: undefined }),
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(HostPage);
  const store = fixture.debugElement.children[0].injector.get(EntriesStore);
  store.setFolderId('folder-1');

  await fixture.whenStable();
  fixture.detectChanges();

  return { fixture, create };
}

function textOf(fixture: ComponentFixture<HostPage>, selector: string): string[] {
  return [...fixture.nativeElement.querySelectorAll(selector)].map((node: Element) =>
    (node.textContent ?? '').trim(),
  );
}

function buttonLabelled(fixture: ComponentFixture<HostPage>, label: string): HTMLButtonElement {
  const match = [...fixture.nativeElement.querySelectorAll('button')].find((node: Element) =>
    (node.textContent ?? '').includes(label),
  );
  if (match === undefined) throw new Error(`no button saying "${label}"`);

  return match as HTMLButtonElement;
}

describe('EntriesPanel', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('offers all five sections of a precaution folder', async () => {
    const { fixture } = await renderPanel();

    expect(textOf(fixture, '.entry-section__heading')).toEqual([
      'Wo liegt was',
      'Verträge und Versicherungen',
      'Digitale Konten',
      'Menschen, die weiterhelfen',
      'Meine Wünsche',
    ]);
  });

  it('says what belongs in a section instead of that it is empty', async () => {
    const { fixture } = await renderPanel();

    expect(textOf(fixture, '.entry-section__empty')[0]).toBe(
      'Tragen Sie ein, wo Testament, Vollmacht oder Urkunden liegen.',
    );
  });

  it('opens a form on demand and never more than one per section', async () => {
    const { fixture } = await renderPanel();
    expect(fixture.nativeElement.querySelectorAll('.entry-section__editor')).toHaveLength(0);

    buttonLabelled(fixture, 'Eintrag hinzufügen').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.entry-section__editor')).toHaveLength(1);
  });

  it('warns against typing a password into the digital accounts section', async () => {
    const { fixture } = await renderPanel();

    const addButtons = [...fixture.nativeElement.querySelectorAll('.entry-section__add')];
    (addButtons[2] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(textOf(fixture, '.entry-form__caution')[0]).toContain('Kein Passwort eintragen');
  });

  it('stores what was typed and shows it as a row', async () => {
    const { fixture, create } = await renderPanel();

    buttonLabelled(fixture, 'Eintrag hinzufügen').click();
    fixture.detectChanges();

    const inputs = fixture.nativeElement.querySelectorAll('.entry-form input');
    (inputs[0] as HTMLInputElement).value = 'Testament';
    inputs[0].dispatchEvent(new Event('input'));
    (inputs[1] as HTMLInputElement).value = 'Bankschließfach';
    inputs[1].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.entry-form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(create).toHaveBeenCalledWith(
      'folder-1',
      'location',
      expect.objectContaining({ title: 'Testament', reference: 'Bankschließfach' }),
      0,
    );
    expect(textOf(fixture, '.entry-row__title')).toEqual(['Testament']);
  });

  it('refuses an entry without a title and says so at the field', async () => {
    const { fixture, create } = await renderPanel();

    buttonLabelled(fixture, 'Eintrag hinzufügen').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.entry-form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(create).not.toHaveBeenCalled();
    expect(textOf(fixture, '.form-field__error')[0]).toBe('Bitte tragen Sie hier etwas ein.');
  });
});
