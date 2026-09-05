import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { PersonCard } from './person-card.component';
import type { TreePerson } from '../tree.types';

function person(overrides: Partial<TreePerson> = {}): TreePerson {
  return {
    id: 'person-1',
    treeId: 'tree-1',
    name: 'Anna Berger',
    birthYear: 1951,
    deceased: false,
    deathYear: null,
    ...overrides,
  };
}

function renderCard(
  value: TreePerson,
  flags: { isRoot?: boolean; isSelected?: boolean } = {},
): ComponentFixture<PersonCard> {
  const fixture = TestBed.createComponent(PersonCard);
  fixture.componentRef.setInput('person', value);
  fixture.componentRef.setInput('isRoot', flags.isRoot ?? false);
  fixture.componentRef.setInput('isSelected', flags.isSelected ?? false);
  fixture.detectChanges();

  return fixture;
}

function textOf(fixture: ComponentFixture<PersonCard>, selector: string): string {
  return (fixture.nativeElement.querySelector(selector)?.textContent ?? '').trim();
}

describe('PersonCard', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('is a button, so the tree can be walked with the keyboard', () => {
    const fixture = renderCard(person());

    expect(fixture.nativeElement.querySelector('button.person-card')).not.toBeNull();
  });

  it('writes a dead relative as a span of years rather than greying them out', () => {
    const fixture = renderCard(person({ birthYear: 1932, deceased: true, deathYear: 2019 }));

    expect(textOf(fixture, '.person-card__years')).toBe('1932–2019');
    expect(
      fixture.nativeElement
        .querySelector('.person-card')
        .classList.contains('person-card--deceased'),
    ).toBe(true);
  });

  it('leaves out the year line entirely when no year is known', () => {
    const fixture = renderCard(person({ birthYear: null }));

    expect(fixture.nativeElement.querySelector('.person-card__years')).toBeNull();
  });

  it('names the starting person for screen readers as well as marking them', () => {
    const fixture = renderCard(person(), { isRoot: true });

    expect(textOf(fixture, '.person-card__role')).toBe('Startperson');
  });

  it('says nothing about a role on everybody else', () => {
    const fixture = renderCard(person());

    expect(fixture.nativeElement.querySelector('.person-card__role')).toBeNull();
  });

  it('marks the selected card as the current one', () => {
    const fixture = renderCard(person(), { isSelected: true });

    expect(fixture.nativeElement.querySelector('.person-card').getAttribute('aria-current')).toBe(
      'true',
    );
  });
});
