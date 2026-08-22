import { OPTION } from '@/app/features/onboarding/onboarding.questions';
import type { RequiredDocument } from './dashboard.types';

/**
 * What authorities, banks and insurers want to see. Deliberately informational only: the app has
 * no storage for documents and must not pretend otherwise.
 */
export const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    id: 'doc-certificate',
    title: 'Totenschein',
    detail: 'Vom Arzt, der den Tod festgestellt hat. Ohne ihn stellt das Standesamt nichts aus.',
  },
  {
    id: 'doc-death-certificate',
    title: 'Sterbeurkunde, fünf bis zehn Ausfertigungen',
    detail:
      'Vom Standesamt des Sterbeorts. Jede Behörde und jeder Versicherer will ein eigenes Original behalten.',
  },
  {
    id: 'doc-id',
    title: 'Personalausweis oder Reisepass',
    detail: 'Wird beim Standesamt gebraucht und danach eingezogen.',
  },
  {
    id: 'doc-birth',
    title: 'Geburtsurkunde',
    detail: 'Vom Standesamt des Geburtsorts, falls sie nicht im Stammbuch liegt.',
  },
  {
    id: 'doc-marriage',
    title: 'Heiratsurkunde oder Stammbuch',
    detail:
      'Bei Geschiedenen zusätzlich das rechtskräftige Scheidungsurteil, bei Verwitweten die Sterbeurkunde des früheren Partners.',
  },
  {
    id: 'doc-will',
    title: 'Testament oder Erbvertrag',
    detail:
      'Muss unverzüglich beim Nachlassgericht abgegeben werden, auch wenn es Sie benachteiligt.',
  },
  {
    id: 'doc-pension',
    title: 'Rentennummer und letzter Rentenbescheid',
    detail: 'Ohne die Versicherungsnummer bearbeitet die Rentenversicherung keinen Antrag.',
  },
  {
    id: 'doc-insurance',
    title: 'Versicherungspolicen',
    detail: 'Leben, Unfall, Sterbegeld: die Policennummer entscheidet, wie schnell gezahlt wird.',
  },
  {
    id: 'doc-bank',
    title: 'Bankunterlagen und Vollmachten',
    detail: 'Eine Vollmacht über den Tod hinaus erspart oft den Erbschein.',
  },
  {
    id: 'doc-rental',
    title: 'Mietvertrag',
    detail: 'Für die Frage, wer eintritt und wer kündigen darf.',
    requires: [OPTION.hasRental],
  },
  {
    id: 'doc-property',
    title: 'Grundbuchauszug und Kaufvertrag',
    detail: 'Das Grundbuchamt braucht beides für die Berichtigung.',
    requires: [OPTION.hasProperty],
  },
  {
    id: 'doc-vehicle',
    title: 'Zulassungsbescheinigung Teil I und II',
    detail: 'Früher Fahrzeugschein und Fahrzeugbrief.',
    requires: [OPTION.hasVehicle],
  },
  {
    id: 'doc-weapons',
    title: 'Waffenbesitzkarte und Waffenliste',
    detail: 'Die Waffenbehörde will wissen, welche Waffen zum Nachlass gehören.',
    requires: [OPTION.hasWeapons],
  },
  {
    id: 'doc-business',
    title: 'Gewerbeanmeldung und Steuernummer',
    detail: 'Gewerbeamt und Finanzamt brauchen beides für die Abmeldung.',
    requires: [OPTION.hasBusiness],
  },
];

/** What belongs in the precaution folder. Hangs off the areas chosen in the onboarding. */
export const PREPARE_DOCUMENTS: RequiredDocument[] = [
  {
    id: 'prep-power-of-attorney',
    title: 'Vorsorgevollmacht',
    detail:
      'Ohne sie bestellt das Betreuungsgericht einen Betreuer – auch wenn Sie verheiratet sind.',
    requires: [OPTION.focusDocuments],
  },
  {
    id: 'prep-living-will',
    title: 'Patientenverfügung',
    detail: 'Legt fest, welche Behandlung Sie wollen, wenn Sie sich nicht mehr äußern können.',
    requires: [OPTION.focusDocuments],
  },
  {
    id: 'prep-will',
    title: 'Testament',
    detail:
      'Handschriftlich und unterschrieben oder notariell. Ohne Testament gilt die gesetzliche Erbfolge.',
    requires: [OPTION.focusDocuments],
  },
  {
    id: 'prep-policies',
    title: 'Liste aller Versicherungen und Verträge',
    detail:
      'Mit Policennummer und Ansprechpartner. Die Nummer entscheidet, wie schnell gezahlt wird.',
    requires: [OPTION.focusContracts],
  },
  {
    id: 'prep-bank',
    title: 'Bankvollmacht über den Tod hinaus',
    detail: 'Erspart Ihrer Familie den Erbschein und wochenlanges Warten auf Zugriff.',
    requires: [OPTION.focusContracts],
  },
  {
    id: 'prep-access',
    title: 'Zugangsdaten oder Notfallkontakt im Passwortmanager',
    detail: 'Eine Liste auf Papier veraltet. Ein Notfallkontakt im Manager bleibt aktuell.',
    requires: [OPTION.focusDigital],
  },
  {
    id: 'prep-wishes',
    title: 'Bestattungsverfügung',
    detail: 'Hält fest, wie Sie bestattet werden möchten. Geht dem Wunsch der Angehörigen vor.',
    requires: [OPTION.focusWishes],
  },
];
