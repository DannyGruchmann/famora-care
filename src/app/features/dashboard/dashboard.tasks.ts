import { OPTION } from '@/app/features/onboarding/onboarding.questions';
import type { TaskDefinition } from './dashboard.types';

/**
 * Tasks after a death. `dueInDays` are statutory or contractual deadlines counted from the day of
 * death; where none is given there is no hard deadline, or it is state law and therefore differs
 * per federal state. This is not legal advice — the texts say where to ask.
 */
export const AFTER_DEATH_TASKS: TaskDefinition[] = [
  {
    id: 'd-certificate',
    title: 'Totenschein ausstellen lassen',
    detail: 'Ein Arzt muss den Tod feststellen. Ohne Totenschein geht beim Standesamt nichts.',
    urgency: 'now',
    completedBy: OPTION.doneCertificate,
  },
  {
    id: 'd-funeral',
    title: 'Bestattungsinstitut beauftragen',
    detail: 'Das Institut übernimmt meist auch die Anmeldung beim Standesamt.',
    urgency: 'now',
    completedBy: OPTION.doneFuneral,
  },
  {
    id: 'd-life-insurance',
    title: 'Lebens- und Unfallversicherung melden',
    detail:
      'Viele Verträge verlangen die Meldung binnen 48 bis 72 Stunden. Das ist die Frist, die am häufigsten verpasst wird.',
    urgency: 'now',
    dueInDays: 2,
  },
  {
    id: 'd-registry',
    title: 'Sterbefall beim Standesamt anzeigen',
    detail: 'Spätestens am dritten Werktag, zuständig ist das Standesamt des Sterbeorts.',
    urgency: 'now',
    dueInDays: 3,
    completedBy: OPTION.doneRegistry,
  },
  {
    id: 'd-certificates',
    title: 'Mehrere Sterbeurkunden anfordern',
    detail:
      'Fünf bis zehn beglaubigte Ausfertigungen. Fast jede Behörde und jeder Versicherer will ein Original sehen.',
    urgency: 'now',
  },
  {
    id: 'd-will',
    title: 'Testament beim Nachlassgericht abgeben',
    detail:
      'Wer ein Testament findet, muss es unverzüglich abliefern. Zurückhalten ist strafbar und schadensersatzpflichtig.',
    urgency: 'now',
  },
  {
    id: 'd-funeral-costs',
    title: 'Bestattungskosten beim Sozialamt beantragen',
    detail:
      'Nur nötig, wenn der Nachlass die Bestattung nicht deckt. Der Antrag muss vor der Beauftragung gestellt werden, danach ist er meist verloren.',
    urgency: 'now',
  },
  {
    id: 'd-inform',
    title: 'Angehörige und Arbeitgeber informieren',
    detail: 'Der Arbeitgeber braucht die Sterbeurkunde für Lohnabrechnung und Betriebsrente.',
    urgency: 'now',
  },
  {
    id: 'd-burial',
    title: 'Bestattungstermin festlegen',
    detail: 'Frühestens 48 Stunden nach dem Tod, in einigen Ländern schon nach 24 Stunden.',
    urgency: 'now',
    usesStateDeadline: true,
  },
  {
    id: 'd-health-insurance',
    title: 'Krankenkasse und Pflegekasse informieren',
    detail: 'Beiträge und laufende Pflegeleistungen enden mit dem Sterbemonat.',
    urgency: 'week',
  },
  {
    id: 'd-pension',
    title: 'Rentenversicherung informieren',
    detail:
      'Die Rente wird nur bis zum Sterbemonat gezahlt. Spätere Zahlungen werden zurückgefordert, notfalls direkt von der Bank.',
    urgency: 'week',
  },
  {
    id: 'd-bank',
    title: 'Bank informieren und Daueraufträge prüfen',
    detail:
      'Prüfen Sie, ob eine Vollmacht über den Tod hinaus besteht – das erspart den Erbschein.',
    urgency: 'week',
  },
  {
    id: 'd-insurances',
    title: 'Übrige Versicherungen melden',
    detail:
      'Haftpflicht, Hausrat, Kfz und Rechtsschutz: manche enden mit dem Tod, andere gehen auf die Erben über.',
    urgency: 'week',
  },
  {
    id: 'd-landlord',
    title: 'Vermieter über den Todesfall informieren',
    detail: 'Wer in der Wohnung lebt, tritt in der Regel automatisch in den Mietvertrag ein.',
    urgency: 'week',
    requires: [OPTION.hasRental],
  },
  {
    id: 'd-family-benefits',
    title: 'Familienkasse und Krankenkasse informieren',
    detail:
      'Kindergeld steht Ihnen für den vollen Sterbemonat zu, spätere Zahlungen werden zurückgefordert. Die Familienversicherung endet mit dem Tod.',
    urgency: 'week',
    requires: [OPTION.relChild],
  },
  {
    id: 'd-weapons',
    title: 'Waffen bei der Waffenbehörde anzeigen',
    detail:
      'Zuständig ist die Waffenbehörde beim Ordnungs- oder Landratsamt, nicht die Polizei. Ohne eigene Erlaubnis müssen die Waffen blockiert werden. Bußgeld bis 10.000 Euro.',
    urgency: 'month',
    dueInDays: 30,
    requires: [OPTION.hasWeapons],
  },
  {
    id: 'd-widow-pension',
    title: 'Witwen- oder Witwerrente beantragen',
    detail:
      'Ein Antrag innerhalb eines Monats sichert das Sterbevierteljahr in voller Rentenhöhe, inklusive Vorschuss über den Rentenservice. Rückwirkend zahlt die Rentenversicherung höchstens zwölf Monate.',
    urgency: 'month',
    dueInDays: 30,
    requires: [OPTION.relPartner],
  },
  {
    id: 'd-orphan-pension',
    title: 'Waisenrente prüfen',
    detail:
      'Bis 18 immer, in Ausbildung oder Studium bis 27. Halbwaisen erhalten 10 Prozent, Vollwaisen 20 Prozent der Rente des Verstorbenen. Rückwirkend höchstens zwölf Monate.',
    urgency: 'month',
    requires: [OPTION.relParent],
  },
  {
    id: 'd-tax-class',
    title: 'Steuerklasse und Witwensplitting prüfen',
    detail:
      'Im Sterbejahr und im Folgejahr wird nach der günstigeren Splittingtabelle veranlagt. Das Finanzamt stellt meist automatisch auf Steuerklasse 3 um – prüfen Sie, ob das passiert ist.',
    urgency: 'month',
    requires: [OPTION.relPartner],
  },
  {
    id: 'd-rental-notice',
    title: 'Mietvertrag klären: Eintritt oder Kündigung',
    detail:
      'Wer mit im Haushalt gelebt hat, tritt automatisch in den Vertrag ein und kann binnen eines Monats widersprechen (§ 563 BGB). Tritt niemand ein, können Erben und Vermieter binnen eines Monats außerordentlich kündigen (§ 564 BGB). Beide Fristen laufen ab Kenntnis vom Tod.',
    urgency: 'month',
    dueInDays: 30,
    requires: [OPTION.hasRental],
  },
  {
    id: 'd-inheritance-decision',
    title: 'Erbschaft annehmen oder ausschlagen',
    detail:
      'Sechs Wochen ab Kenntnis. Ausschlagen geht nur beim Nachlassgericht oder notariell – ein Brief reicht nicht. Wichtig bei überschuldetem Nachlass.',
    urgency: 'month',
    dueInDays: 42,
  },
  {
    id: 'd-inheritance-tax',
    title: 'Erbschaft beim Finanzamt anzeigen',
    detail:
      'Formlos innerhalb von drei Monaten, auch wenn der Freibetrag offensichtlich nicht überschritten wird.',
    urgency: 'month',
    dueInDays: 90,
  },
  {
    id: 'd-vehicle',
    title: 'Fahrzeug ummelden oder abmelden',
    detail: 'Die Kfz-Versicherung geht zunächst auf die Erben über und läuft weiter.',
    urgency: 'month',
    requires: [OPTION.hasVehicle],
  },
  {
    id: 'd-broadcast-fee',
    title: 'Rundfunkbeitrag ummelden',
    detail: 'Der Beitrag läuft sonst weiter, auch für eine leerstehende Wohnung.',
    urgency: 'month',
  },
  {
    id: 'd-documents-return',
    title: 'Ausweis, Pass und Führerschein abgeben',
    detail: 'Auch der Schwerbehindertenausweis geht zurück an das Versorgungsamt.',
    urgency: 'month',
  },
  {
    id: 'd-contracts',
    title: 'Laufende Verträge kündigen',
    detail:
      'Strom, Telefon, Internet, Abos und Mitgliedschaften. Viele AGB räumen im Todesfall ein Sonderkündigungsrecht ein.',
    urgency: 'month',
  },
  {
    id: 'd-business',
    title: 'Gewerbe abmelden',
    detail: 'Gewerbeamt, Finanzamt, Kammer und Berufsgenossenschaft brauchen jeweils eine Meldung.',
    urgency: 'month',
    requires: [OPTION.hasBusiness],
  },
  {
    id: 'd-pets',
    title: 'Haustiere ummelden',
    detail: 'Halterwechsel und Hundesteuer laufen über das Ordnungsamt.',
    urgency: 'month',
    requires: [OPTION.hasPets],
  },
  {
    id: 'd-land-registry',
    title: 'Grundbuch berichtigen lassen',
    detail: 'Innerhalb von zwei Jahren nach dem Erbfall gebührenfrei, danach kostet es.',
    urgency: 'later',
    dueInDays: 730,
    requires: [OPTION.hasProperty],
  },
  {
    id: 'd-inheritance-certificate',
    title: 'Erbschein beantragen, falls nötig',
    detail:
      'Ein notarielles Testament mit Eröffnungsprotokoll reicht Banken und Grundbuchamt meist aus – das spart die Gebühr.',
    urgency: 'later',
  },
  {
    id: 'd-compulsory-share',
    title: 'Pflichtteil prüfen, falls Sie enterbt wurden',
    detail:
      'Kinder und Ehepartner haben trotz Testament Anspruch auf die Hälfte ihres gesetzlichen Erbteils, als Geldzahlung. Der Anspruch verjährt drei Jahre nach dem Jahresende, in dem Sie von der Enterbung erfahren haben.',
    urgency: 'later',
    requires: [OPTION.relParent],
  },
  {
    id: 'd-tax-return',
    title: 'Steuererklärung des Verstorbenen abgeben',
    detail: 'Die Pflicht geht auf die Erben über. Oft gibt es Geld zurück.',
    urgency: 'later',
  },
  {
    id: 'd-digital',
    title: 'Digitale Konten schließen',
    detail: 'E-Mail, Social Media, Cloud, Zahlungsdienste und Domains.',
    urgency: 'later',
  },
];

/**
 * Precaution knows no running deadlines. Every task hangs off an area from the onboarding and
 * only appears once that area was chosen.
 */
export const PREPARE_TASKS: TaskDefinition[] = [
  {
    id: 'p-trustee-decide',
    title: 'Entscheiden, wer im Ernstfall Zugriff bekommt',
    detail:
      'Ohne benannte Person nützt die beste Vorsorge nichts – dann sucht die Familie doch wieder im Aktenordner.',
    urgency: 'now',
    requires: [OPTION.trusteeUndecided],
  },
  {
    id: 'p-trustee-inform',
    title: 'Vertrauensperson zeigen, wo alles liegt',
    detail: 'Ein einziges Gespräch ersetzt später wochenlanges Suchen.',
    urgency: 'week',
  },
  {
    id: 'p-documents-collect',
    title: 'Wichtige Dokumente an einem Ort sammeln',
    detail: 'Ausweis, Urkunden, Policen, Verträge, Bankunterlagen.',
    urgency: 'now',
    requires: [OPTION.focusDocuments],
    completedByEntries: 'location',
  },
  {
    id: 'p-documents-power',
    title: 'Vorsorgevollmacht und Patientenverfügung prüfen',
    detail: 'Ohne Vollmacht entscheidet im Ernstfall ein gerichtlich bestellter Betreuer.',
    urgency: 'week',
    requires: [OPTION.focusDocuments],
  },
  {
    id: 'p-contracts-list',
    title: 'Versicherungen und Verträge auflisten',
    detail: 'Ihre Familie muss später wissen, was überhaupt existiert.',
    urgency: 'week',
    requires: [OPTION.focusContracts],
    completedByEntries: 'contract',
  },
  {
    id: 'p-contracts-check',
    title: 'Bezugsberechtigte in den Policen prüfen',
    detail:
      'Die Lebensversicherung zahlt an die eingetragene Person, unabhängig vom Testament. Alte Einträge stimmen oft nicht mehr.',
    urgency: 'month',
    requires: [OPTION.focusContracts],
  },
  {
    id: 'p-digital-accounts',
    title: 'Digitale Konten und Abos auflisten',
    detail: 'E-Mail, Cloud, Zahlungsdienste, Abos und Domains.',
    urgency: 'now',
    requires: [OPTION.focusDigital],
    completedByEntries: 'account',
  },
  {
    id: 'p-digital-access',
    title: 'Notfallzugang im Passwortmanager einrichten',
    detail: 'Passwörter auf Papier veralten. Ein Notfallkontakt im Manager bleibt aktuell.',
    urgency: 'month',
    requires: [OPTION.focusDigital],
  },
  {
    id: 'p-wishes-funeral',
    title: 'Wünsche zur Bestattung festhalten',
    detail: 'Erspart der Familie Entscheidungen in den schwersten Tagen.',
    urgency: 'month',
    requires: [OPTION.focusWishes],
    completedByEntries: 'wish',
  },
  {
    id: 'p-wishes-message',
    title: 'Persönliche Nachricht an die Familie hinterlegen',
    detail: 'Das, was in keinem Formular steht.',
    urgency: 'later',
    requires: [OPTION.focusWishes],
  },
];
