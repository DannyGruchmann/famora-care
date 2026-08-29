import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FamilySection } from './family-section.component';
import { buildFamilyTree } from '../family.tree';
import type { HelperDraft, HelperWithLoad } from '../family.types';

const HINT = 'Wer hilft Ihnen dabei?';

function personWith(overrides: Partial<HelperWithLoad> = {}): HelperWithLoad {
  return {
    id: 'helper-1',
    name: 'Anna',
    relation: 'other',
    deceased: false,
    openTaskCount: 0,
    ...overrides,
  };
}

async function renderSection(people: HelperWithLoad[]): Promise<ComponentFixture<FamilySection>> {
  const fixture = TestBed.createComponent(FamilySection);
  setPeople(fixture, people);
  fixture.componentRef.setInput('hint', HINT);
  await fixture.whenStable();
  fixture.detectChanges();

  return fixture;
}

function setPeople(fixture: ComponentFixture<FamilySection>, people: HelperWithLoad[]): void {
  fixture.componentRef.setInput('helpers', people);
  fixture.componentRef.setInput('tree', buildFamilyTree(people, 'Ich'));
}

function query<T extends Element>(fixture: ComponentFixture<FamilySection>, selector: string): T {
  const element: T | null = fixture.nativeElement.querySelector(selector);
  if (element === null) throw new Error(`nothing matched ${selector}`);

  return element;
}

/** The edit form of the first row; the add form at the bottom carries its own id prefix. */
function editNameInput(fixture: ComponentFixture<FamilySection>): HTMLInputElement {
  return query<HTMLInputElement>(fixture, '#edit-helper-1-name');
}

async function openEditForm(fixture: ComponentFixture<FamilySection>): Promise<void> {
  query<HTMLButtonElement>(fixture, '.helper-row__edit').click();
  await fixture.whenStable();
  fixture.detectChanges();
}

function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('FamilySection', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('opens the form in place of the row it belongs to', async () => {
    const fixture = await renderSection([personWith()]);

    expect(fixture.nativeElement.querySelectorAll('.helper-row')).toHaveLength(1);

    await openEditForm(fixture);

    expect(fixture.nativeElement.querySelector('.helper-row')).toBeNull();
    expect(editNameInput(fixture).value).toBe('Anna');
    // Two open forms in one section invite changing the wrong person.
    expect(fixture.nativeElement.querySelector('#add-helper-name')).toBeNull();
  });

  it('reports the change against the id, which is what carries the assignments', async () => {
    const fixture = await renderSection([personWith()]);
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);

    await openEditForm(fixture);
    type(editNameInput(fixture), 'Anna Weber');
    fixture.detectChanges();
    query<HTMLFormElement>(fixture, '.helper-form').dispatchEvent(new Event('submit'));

    const expected: HelperDraft = { name: 'Anna Weber', relation: 'other', deceased: false };
    expect(changed).toHaveBeenCalledWith({ id: 'helper-1', draft: expected });
  });

  /**
   * `helpers` carries the open-task count, so ticking off a checklist item anywhere on the
   * dashboard hands this section a fresh array. Refilling the form from it would eat the input.
   */
  it('keeps what is being typed when the list is handed over again', async () => {
    const fixture = await renderSection([personWith()]);

    await openEditForm(fixture);
    type(editNameInput(fixture), 'Anna Weber');
    fixture.detectChanges();

    setPeople(fixture, [personWith({ openTaskCount: 3 })]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(editNameInput(fixture).value).toBe('Anna Weber');
  });

  it('takes focus into the form and hands it back to the row afterwards', async () => {
    const fixture = await renderSection([personWith()]);

    await openEditForm(fixture);

    expect(document.activeElement).toBe(editNameInput(fixture));

    query<HTMLButtonElement>(
      fixture,
      '.helper-form__buttons famora-button[variant="ghost"] button',
    ).click();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(query(fixture, '.helper-row__edit'));
  });
});
