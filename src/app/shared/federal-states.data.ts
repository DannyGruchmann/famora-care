export interface FederalState {
  id: string;
  label: string;
  /** Latest burial date, in days after the death. */
  burialWithinDays: number;
  /** Citation in state law, so the number stays verifiable. */
  law: string;
  /** Deadline for interring the urn, as text: not every state names one. */
  urnDeadline?: string;
  /** A particularity that would otherwise distort the plain number. */
  note?: string;
}

/**
 * Burial law is state law in Germany; there is no federal statute. The deadlines come from the
 * states' burial acts (as of July 2026); health authorities may extend or shorten them case by
 * case. Widely circulated comparison tables online are outdated in several places — so only ever
 * change a number together with its citation.
 */
export const FEDERAL_STATES: FederalState[] = [
  {
    id: 'bw',
    label: 'Baden-Württemberg',
    burialWithinDays: 4,
    law: '§ 37 BestattG BW',
    urnDeadline: '96 Stunden, wie bei der Erdbestattung',
    note: 'Die 96 Stunden gelten nur, solange der Leichnam nicht in einer Leichenhalle aufgebahrt ist.',
  },
  {
    id: 'by',
    label: 'Bayern',
    burialWithinDays: 8,
    law: '§ 19 Abs. 1 BestV',
    note: 'Bayern lässt keine Ausnahmen von der Sargpflicht zu.',
  },
  {
    id: 'be',
    label: 'Berlin',
    burialWithinDays: 4,
    law: '§ 9 Abs. 4 Friedhofsordnung',
    urnDeadline: 'sechs Monate (§ 21 Abs. 2 BestattG)',
    note: 'Die vier Tage zählen ab Einlieferung in die Leichenhalle, nicht ab dem Todestag – Sie haben also in der Regel mehr Zeit.',
  },
  {
    id: 'bb',
    label: 'Brandenburg',
    burialWithinDays: 10,
    law: '§ 19 Abs. 3 BbgBestG',
    urnDeadline: 'ebenfalls zehn Tage nach Feststellung des Todes',
  },
  {
    id: 'hb',
    label: 'Bremen',
    burialWithinDays: 10,
    law: '§ 16 LeichenG',
    urnDeadline: 'ein Monat nach der Einäscherung',
    note: 'Bremen erlaubt als einziges Land das Verstreuen der Asche außerhalb von Friedhöfen, unter Auflagen.',
  },
  {
    id: 'hh',
    label: 'Hamburg',
    burialWithinDays: 10,
    law: '§ 10 Abs. 1 BestattG',
    urnDeadline: 'ein Monat nach der Einäscherung (§ 16 Abs. 3 BestattG)',
    note: 'Der Leichnam muss schon innerhalb von 36 Stunden in eine Leichenhalle überführt werden.',
  },
  {
    id: 'he',
    label: 'Hessen',
    burialWithinDays: 10,
    law: '§ 16 Abs. 1 FBG',
  },
  {
    id: 'mv',
    label: 'Mecklenburg-Vorpommern',
    burialWithinDays: 10,
    law: '§ 11 Abs. 2 BestattG M-V',
    note: 'Eine Aufbahrung zu Hause ist nur 36 Stunden zulässig.',
  },
  {
    id: 'ni',
    label: 'Niedersachsen',
    burialWithinDays: 8,
    law: '§ 9 Abs. 2 BestattG',
    urnDeadline: 'ein Monat nach der Einäscherung',
  },
  {
    id: 'nw',
    label: 'Nordrhein-Westfalen',
    burialWithinDays: 10,
    law: '§ 13 BestG NRW',
    urnDeadline: 'sechs Wochen nach der Einäscherung',
    note: 'NRW erlaubt die Beisetzung der Asche auf privaten Flächen unter engen Auflagen.',
  },
  {
    id: 'rp',
    label: 'Rheinland-Pfalz',
    burialWithinDays: 14,
    law: '§ 23 Abs. 1 BestG',
    note: 'Seit der Reform vom 27. September 2025 gelten 14 statt 10 Tage. Urne zu Hause und Ascheverstreuung im eigenen Garten sind seither erlaubt.',
  },
  {
    id: 'sl',
    label: 'Saarland',
    burialWithinDays: 10,
    law: '§ 29 Abs. 2 BestattG',
    urnDeadline: 'drei Monate nach der Einäscherung',
  },
  {
    id: 'sn',
    label: 'Sachsen',
    burialWithinDays: 8,
    law: '§ 19 Abs. 1 SächsBestG',
    urnDeadline: 'sechs Monate nach der Einäscherung',
  },
  {
    id: 'st',
    label: 'Sachsen-Anhalt',
    burialWithinDays: 10,
    law: '§ 17 Abs. 2 BestattG LSA',
    urnDeadline: 'sechs Monate nach der Einäscherung',
    note: 'Sachsen-Anhalt verlangt vor jeder Bestattung eine zweite Leichenschau, nicht nur vor der Einäscherung.',
  },
  {
    id: 'sh',
    label: 'Schleswig-Holstein',
    burialWithinDays: 9,
    law: '§ 16 Abs. 1 BestattG',
    urnDeadline: 'drei Monate nach der Einäscherung',
  },
  {
    id: 'th',
    label: 'Thüringen',
    burialWithinDays: 10,
    law: '§ 17 Abs. 3 ThürBestG',
    urnDeadline: 'sechs Monate nach der Einäscherung',
  },
];

/** null on an unknown id — an old stored record must not take the app down either. */
export function findFederalState(id: string | null): FederalState | null {
  if (id === null) return null;
  return FEDERAL_STATES.find((state) => state.id === id) ?? null;
}
