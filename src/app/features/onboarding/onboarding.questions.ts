import { FEDERAL_STATES } from '@/app/shared/federal-states.data';
import type { OnboardingAnswers, OnboardingMode, Question } from './onboarding.types';

export const MODE_QUESTION_ID = 'mode';
export const MODE_AFTER_DEATH = 'after-death';
export const MODE_PREPARE = 'prepare';

/** Query parameter the landing page uses to preselect the path: /start?pfad=prepare */
export const MODE_PARAM = 'pfad';

const DEATH_DATE_QUESTION_ID = 'death-date';
const STATE_QUESTION_ID = 'state';
const RELATION_QUESTION_ID = 'relation';
const NAME_QUESTION_ID = 'person-name';
const DONE_QUESTION_ID = 'done';
const CIRCUMSTANCES_QUESTION_ID = 'circumstances';
const SUPPORT_QUESTION_ID = 'support';
const FOCUS_QUESTION_ID = 'prepare-focus';
const TRUSTEE_QUESTION_ID = 'prepare-who';

const SUPPORT_WITH_FAMILY = 'family';

/**
 * Option ids other features refer to (the dashboard builds its list from them). Renaming one makes
 * the answers in already stored folders worthless: they hold the old id, and no task recognises it.
 */
export const OPTION = {
  relPartner: 'rel-partner',
  relParent: 'rel-parent',
  relChild: 'rel-child',
  relOther: 'rel-other',
  doneCertificate: 'certificate',
  doneFuneral: 'funeral',
  doneRegistry: 'registry',
  doneNothing: 'nothing',
  hasWeapons: 'weapons',
  hasProperty: 'property',
  hasRental: 'rental',
  hasVehicle: 'vehicle',
  hasBusiness: 'business',
  hasPets: 'pets',
  hasNoneOfThat: 'no-circumstances',
  focusDocuments: 'documents',
  focusContracts: 'contracts',
  focusDigital: 'digital',
  focusWishes: 'wishes',
  trusteePartner: 'who-partner',
  trusteeChildren: 'who-children',
  trusteeUndecided: 'who-undecided',
} as const;

/** null for anything that is not a valid path — including tampered URLs and old records. */
export function toMode(value: string | null | undefined): OnboardingMode | null {
  if (value === MODE_AFTER_DEATH || value === MODE_PREPARE) return value;
  return null;
}

/** null while the entry question is unanswered. */
export function getMode(answers: OnboardingAnswers): OnboardingMode | null {
  return toMode(answers[MODE_QUESTION_ID]?.[0]);
}

/** Date of death as an ISO date — the reference point of every deadline. null when not given. */
export function getDeathDate(answers: OnboardingAnswers): string | null {
  return answers[DEATH_DATE_QUESTION_ID]?.[0] ?? null;
}

/**
 * The first name of the person who died. Optional and steers nothing — it only names the folder.
 * null when skipped or when only whitespace was entered.
 */
export function getPersonName(answers: OnboardingAnswers): string | null {
  const name = answers[NAME_QUESTION_ID]?.[0]?.trim();

  return name === undefined || name === '' ? null : name;
}

/** Id of the federal state — the deadlines from state law hang off it. */
export function getStateId(answers: OnboardingAnswers): string | null {
  return answers[STATE_QUESTION_ID]?.[0] ?? null;
}

/** What the onboarding says is already done — option ids of "Was ist schon erledigt?". */
export function getCompletedOptionIds(answers: OnboardingAnswers): string[] {
  return answers[DONE_QUESTION_ID] ?? [];
}

/**
 * Every option id conditional tasks hang off: relationship, particularities of the estate,
 * areas of provision and the trusted person. Both paths use the same `requires` field.
 */
export function getRequirementIds(answers: OnboardingAnswers): string[] {
  return [
    ...(answers[RELATION_QUESTION_ID] ?? []),
    ...(answers[CIRCUMSTANCES_QUESTION_ID] ?? []),
    ...(answers[FOCUS_QUESTION_ID] ?? []),
    ...(answers[TRUSTEE_QUESTION_ID] ?? []),
  ];
}

/** Whoever expects help should find the family section open rather than have to look for it. */
export function expectsFamilyHelp(answers: OnboardingAnswers): boolean {
  return answers[SUPPORT_QUESTION_ID]?.[0] === SUPPORT_WITH_FAMILY;
}

function isAfterDeath(answers: OnboardingAnswers): boolean {
  return getMode(answers) === MODE_AFTER_DEATH;
}

function isPreparing(answers: OnboardingAnswers): boolean {
  return getMode(answers) === MODE_PREPARE;
}

/**
 * Questions are data, not markup. A new question means a new entry here, without touching a
 * single component.
 */
export const QUESTIONS: Question[] = [
  {
    id: MODE_QUESTION_ID,
    kind: 'choice',
    eyebrow: 'Ihr Einstieg',
    title: 'Weshalb sind Sie hier?',
    hint: 'Es gibt keine falsche Antwort. Sie können später jederzeit wechseln.',
    options: [
      {
        id: MODE_AFTER_DEATH,
        label: 'Jemand ist gestorben',
        hint: 'Ich muss jetzt Dinge regeln.',
      },
      {
        id: MODE_PREPARE,
        label: 'Ich möchte vorsorgen',
        hint: 'Damit meine Familie später weiß, was zu tun ist.',
      },
    ],
  },
  {
    id: RELATION_QUESTION_ID,
    kind: 'choice',
    eyebrow: 'Ihre Situation',
    title: 'Wen haben Sie verloren?',
    hint: 'Das bestimmt, welche Fristen und Ansprüche für Sie gelten.',
    showIf: isAfterDeath,
    options: [
      { id: OPTION.relPartner, label: 'Meine Partnerin oder meinen Partner' },
      { id: OPTION.relParent, label: 'Mutter oder Vater' },
      { id: OPTION.relChild, label: 'Mein Kind' },
      { id: OPTION.relOther, label: 'Jemand anderen' },
    ],
  },
  {
    id: NAME_QUESTION_ID,
    kind: 'text',
    eyebrow: 'Name',
    title: 'Wie hieß sie oder er?',
    hint: 'Freiwillig. Der Name benennt Ihren Ordner – sonst heißt er schlicht "Ihr Ordner".',
    label: 'Vorname',
    placeholder: 'Maria',
    showIf: isAfterDeath,
    // Nobody has to type the name to get their checklist. For some it is still too much after a
    // few days; the list does not need it anyway.
    optional: true,
  },
  {
    id: DEATH_DATE_QUESTION_ID,
    kind: 'date',
    eyebrow: 'Zeit',
    title: 'Wann ist es passiert?',
    hint: 'Die meisten Fristen laufen ab dem Todestag. Mit dem Datum rechnen wir sie für Sie aus.',
    label: 'Todestag',
    showIf: isAfterDeath,
  },
  {
    id: STATE_QUESTION_ID,
    kind: 'select',
    eyebrow: 'Ort',
    title: 'In welchem Bundesland ist es passiert?',
    hint: 'Das Bestattungsrecht ist Ländersache. Die Frist für die Bestattung reicht je nach Land von vier bis vierzehn Tagen.',
    label: 'Bundesland',
    showIf: isAfterDeath,
    // Writing the state names out a second time would be a copy that drifts eventually.
    options: FEDERAL_STATES.map((state) => ({ id: state.id, label: state.label })),
  },
  {
    id: DONE_QUESTION_ID,
    kind: 'choice',
    eyebrow: 'Stand',
    title: 'Was ist schon erledigt?',
    hint: 'Mehrfachauswahl. Was Sie hier abhaken, blenden wir aus Ihrer Liste aus.',
    multiple: true,
    showIf: isAfterDeath,
    options: [
      { id: OPTION.doneCertificate, label: 'Totenschein liegt vor' },
      { id: OPTION.doneFuneral, label: 'Bestattung ist beauftragt' },
      { id: OPTION.doneRegistry, label: 'Sterbeurkunde ist beantragt' },
      { id: OPTION.doneNothing, label: 'Noch nichts davon', exclusive: true },
    ],
  },
  {
    id: CIRCUMSTANCES_QUESTION_ID,
    kind: 'choice',
    eyebrow: 'Nachlass',
    title: 'Was gab es im Haushalt?',
    hint: 'Mehrfachauswahl. Daran hängen eigene Fristen, die sonst leicht untergehen.',
    multiple: true,
    showIf: isAfterDeath,
    options: [
      {
        id: OPTION.hasWeapons,
        label: 'Waffen oder einen Jagdschein',
      },
      { id: OPTION.hasRental, label: 'Eine Mietwohnung' },
      { id: OPTION.hasProperty, label: 'Eine eigene Immobilie' },
      { id: OPTION.hasVehicle, label: 'Ein Fahrzeug' },
      { id: OPTION.hasBusiness, label: 'Ein Gewerbe oder eine Selbstständigkeit' },
      { id: OPTION.hasPets, label: 'Haustiere' },
      { id: OPTION.hasNoneOfThat, label: 'Nichts davon', exclusive: true },
    ],
  },
  {
    id: SUPPORT_QUESTION_ID,
    kind: 'choice',
    eyebrow: 'Unterstützung',
    title: 'Stehen Sie damit allein da?',
    hint: 'Wenn nicht, können Sie Aufgaben in der Familie verteilen.',
    showIf: isAfterDeath,
    options: [
      { id: 'alone', label: 'Ja, ich regle das allein' },
      { id: SUPPORT_WITH_FAMILY, label: 'Nein, Familie hilft mit' },
      { id: 'unsure', label: 'Das weiß ich noch nicht' },
    ],
  },
  {
    id: FOCUS_QUESTION_ID,
    kind: 'choice',
    eyebrow: 'Vorsorge',
    title: 'Womit möchten Sie anfangen?',
    hint: 'Mehrfachauswahl. Sie können jederzeit weitere Bereiche ergänzen.',
    multiple: true,
    showIf: isPreparing,
    options: [
      { id: OPTION.focusDocuments, label: 'Wichtige Dokumente hinterlegen' },
      { id: OPTION.focusContracts, label: 'Verträge und Versicherungen' },
      { id: OPTION.focusDigital, label: 'Digitale Konten und Passwörter' },
      { id: OPTION.focusWishes, label: 'Meine Wünsche festhalten' },
    ],
  },
  {
    id: TRUSTEE_QUESTION_ID,
    kind: 'choice',
    eyebrow: 'Vorsorge',
    title: 'Wer soll das im Ernstfall sehen?',
    showIf: isPreparing,
    options: [
      { id: OPTION.trusteePartner, label: 'Meine Partnerin oder mein Partner' },
      { id: OPTION.trusteeChildren, label: 'Meine Kinder' },
      { id: OPTION.trusteeUndecided, label: 'Das entscheide ich später' },
    ],
  },
];
