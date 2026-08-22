import type { EntryKind } from './entry.types';

/**
 * How a section presents itself. The five kinds share one table and one form because they share
 * one shape — only the labelling differs, and labelling is data, not markup. Same reasoning as
 * onboarding.questions.ts: a sixth section means a sixth entry here, not a sixth component.
 */
export interface EntryKindConfig {
  kind: EntryKind;
  /** Section heading in the folder. */
  label: string;
  /** One sentence under the heading: what belongs in here and why it helps later. */
  hint: string;
  titleLabel: string;
  titlePlaceholder: string;
  /** Undefined hides the field — a wish has nothing to reference. */
  referenceLabel?: string;
  referencePlaceholder?: string;
  /** Undefined hides the field. A contact entry is the contact; it needs no second one. */
  contactLabel?: string;
  contactPlaceholder?: string;
  detailLabel: string;
  detailPlaceholder: string;
  /** Shown while the section is still empty. Says what to add, not that nothing is there. */
  emptyText: string;
  /** An extra warning under the form, for the one section where it matters. */
  caution?: string;
}

export const ENTRY_KINDS: EntryKindConfig[] = [
  {
    kind: 'location',
    label: 'Wo liegt was',
    hint: 'Das Wichtigste überhaupt. Ihre Familie sucht später nicht nach Antworten, sondern nach Papieren.',
    titleLabel: 'Was ist es?',
    titlePlaceholder: 'Testament',
    referenceLabel: 'Wo liegt es?',
    referencePlaceholder: 'Bankschließfach bei der Sparkasse',
    contactLabel: 'Wer weiß Bescheid?',
    contactPlaceholder: 'Notar Dr. Weber, 03447 512340',
    detailLabel: 'Notiz',
    detailPlaceholder: 'Der zweite Schlüssel liegt im Schreibtisch.',
    emptyText: 'Tragen Sie ein, wo Testament, Vollmacht oder Urkunden liegen.',
  },
  {
    kind: 'contract',
    label: 'Verträge und Versicherungen',
    hint: 'Ohne eine Liste weiß niemand, was überhaupt existiert – und Verträge laufen weiter.',
    titleLabel: 'Anbieter und Vertrag',
    titlePlaceholder: 'Allianz Hausratversicherung',
    referenceLabel: 'Vertrags- oder Policennummer',
    referencePlaceholder: 'HR-4711-2024',
    contactLabel: 'Ansprechpartner',
    contactPlaceholder: 'Frau Kern, 0341 5589021',
    detailLabel: 'Was soll damit passieren?',
    detailPlaceholder: 'Kündigen. Zahlt jährlich im März ab.',
    emptyText: 'Tragen Sie ein, welche Versicherungen und Verträge laufen.',
  },
  {
    kind: 'account',
    label: 'Digitale Konten',
    hint: 'E-Mail, Cloud, Abos, Zahlungsdienste. Was niemand kennt, kann niemand schließen.',
    titleLabel: 'Dienst',
    titlePlaceholder: 'Google',
    referenceLabel: 'Benutzername',
    referencePlaceholder: 'maria.mustermann@web.de',
    detailLabel: 'Was soll damit passieren?',
    detailPlaceholder: 'Konto löschen. Fotos vorher sichern.',
    emptyText: 'Tragen Sie ein, welche Konten und Abos auf Sie laufen.',
    caution:
      'Kein Passwort eintragen. Famora ist kein Passwort-Manager – richten Sie stattdessen einen Notfallkontakt in Ihrem Passwort-Manager ein.',
  },
  {
    kind: 'contact',
    label: 'Menschen, die weiterhelfen',
    hint: 'Wen Ihre Familie anrufen kann, ohne erst suchen zu müssen.',
    titleLabel: 'Name und Rolle',
    titlePlaceholder: 'Dr. Weber, Notar',
    referenceLabel: 'Telefon oder E-Mail',
    referencePlaceholder: '03447 512340',
    detailLabel: 'Wofür zuständig?',
    detailPlaceholder: 'Hat das Testament beurkundet.',
    emptyText: 'Tragen Sie Notar, Steuerberater, Hausarzt oder Arbeitgeber ein.',
  },
  {
    kind: 'wish',
    label: 'Meine Wünsche',
    hint: 'Das erspart Ihrer Familie Entscheidungen in den schwersten Tagen.',
    titleLabel: 'Worum geht es?',
    titlePlaceholder: 'Bestattung',
    detailLabel: 'Ihr Wunsch',
    detailPlaceholder: 'Seebestattung, keine Trauerfeier, keine Traueranzeige.',
    emptyText: 'Halten Sie fest, was Ihnen wichtig ist – zur Bestattung und darüber hinaus.',
  },
];

export function findEntryKind(kind: EntryKind): EntryKindConfig {
  const config = ENTRY_KINDS.find((entry) => entry.kind === kind);
  if (config === undefined) throw new Error(`unknown entry kind ${kind}`);

  return config;
}

/** null for anything that is not one of the five — an old row must not take the folder down. */
export function toEntryKind(value: string): EntryKind | null {
  return ENTRY_KINDS.some((config) => config.kind === value) ? (value as EntryKind) : null;
}
