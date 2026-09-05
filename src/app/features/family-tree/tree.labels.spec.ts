import { describeAddRelative, describeLifespan, describePerson, describeTree } from './tree.labels';
import type { TreePerson } from './tree.types';

function person(overrides: Partial<TreePerson> = {}): TreePerson {
  return {
    id: 'person-1',
    treeId: 'tree-1',
    name: 'Anna Berger',
    birthYear: null,
    deceased: false,
    deathYear: null,
    ...overrides,
  };
}

describe('describeLifespan', () => {
  it('writes both years as a span for somebody who has died', () => {
    expect(describeLifespan(person({ birthYear: 1932, deceased: true, deathYear: 2019 }))).toBe(
      '1932–2019',
    );
  });

  it('says only what is known when the year of death is not', () => {
    expect(describeLifespan(person({ birthYear: 1932, deceased: true }))).toBe(
      'geb. 1932, verstorben',
    );
    expect(describeLifespan(person({ deceased: true }))).toBe('verstorben');
  });

  it('gives a living person their year of birth', () => {
    expect(describeLifespan(person({ birthYear: 1951 }))).toBe('geb. 1951');
  });

  it('stays empty rather than inventing a placeholder when nothing is known', () => {
    expect(describeLifespan(person())).toBe('');
  });
});

describe('describePerson', () => {
  it('leaves out the comma when there are no years to follow it', () => {
    expect(describePerson(person())).toBe('Anna Berger');
    expect(describePerson(person({ birthYear: 1951 }))).toBe('Anna Berger, geb. 1951');
  });
});

describe('describeTree and describeAddRelative', () => {
  it('counts in singular where German expects it', () => {
    expect(describeTree(1, 1)).toBe('1 Person, 1 Generation');
    expect(describeTree(14, 4)).toBe('14 Personen, 4 Generationen');
  });

  it('names who the new person is being added to', () => {
    expect(describeAddRelative('parent', 'Anna Berger')).toBe('Elternteil von Anna Berger');
  });
});
