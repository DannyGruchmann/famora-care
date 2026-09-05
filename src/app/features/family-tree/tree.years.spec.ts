import { checkYears, parseYear, yearToInput } from './tree.years';
import type { PersonDraft } from './tree.types';

function draft(overrides: Partial<PersonDraft> = {}): PersonDraft {
  return { name: 'Anna Berger', birthYear: null, deceased: false, deathYear: null, ...overrides };
}

describe('parseYear', () => {
  it('reads a plain year and ignores the spaces around it', () => {
    expect(parseYear(' 1951 ')).toBe(1951);
  });

  it('answers null for an empty field rather than zero', () => {
    expect(parseYear('')).toBeNull();
    expect(parseYear('   ')).toBeNull();
  });

  it('refuses anything that is not four digits at most', () => {
    expect(parseYear('19. Mai')).toBeNull();
    expect(parseYear('20255')).toBeNull();
    expect(parseYear('-1951')).toBeNull();
  });

  it('turns a year back into what the field shows, empty for none', () => {
    expect(yearToInput(1951)).toBe('1951');
    expect(yearToInput(null)).toBe('');
  });
});

describe('checkYears', () => {
  it('accepts a plausible life', () => {
    expect(
      checkYears(draft({ birthYear: 1932, deceased: true, deathYear: 2019 }), 2026),
    ).toBeUndefined();
  });

  it('catches a year in the future, which the database cannot', () => {
    expect(checkYears(draft({ birthYear: 2030 }), 2026)).toBe(
      'Das Geburtsjahr liegt in der Zukunft.',
    );
    expect(checkYears(draft({ deceased: true, deathYear: 2030 }), 2026)).toBe(
      'Das Sterbejahr liegt in der Zukunft.',
    );
  });

  it('catches a death before a birth', () => {
    expect(checkYears(draft({ birthYear: 1990, deceased: true, deathYear: 1950 }), 2026)).toBe(
      'Das Sterbejahr liegt vor dem Geburtsjahr.',
    );
  });

  it('ignores a year of death nobody is going to save anyway', () => {
    expect(
      checkYears(draft({ birthYear: 1990, deceased: false, deathYear: 1950 }), 2026),
    ).toBeUndefined();
  });
});
