import { MODE_AFTER_DEATH, MODE_PREPARE } from '@/app/features/onboarding/onboarding.questions';
import type { OnboardingMode } from '@/app/features/onboarding/onboarding.types';
import { PREPARE_DOCUMENTS, REQUIRED_DOCUMENTS } from './dashboard.documents';
import { AFTER_DEATH_TASKS, PREPARE_TASKS } from './dashboard.tasks';
import type { DashboardPreset, Urgency } from './dashboard.types';

export const URGENCY_ORDER: Urgency[] = ['now', 'week', 'month', 'later'];

const AFTER_DEATH: DashboardPreset = {
  urgencyLabels: {
    now: 'Sofort',
    week: 'Diese Woche',
    month: 'Diesen Monat',
    later: 'Später',
  },
  tasks: AFTER_DEATH_TASKS,
  documents: REQUIRED_DOCUMENTS,
  documentsHint: 'Diese Unterlagen werden Sie brauchen – und hier bekommen Sie sie.',
  familyHint:
    'Sie müssen das nicht allein tragen. Tragen Sie ein, wer mithilft, und verteilen Sie die Aufgaben.',
};

/** Calmer labels: nothing is pressing on the precaution path, "Sofort" would be the wrong tone. */
const PREPARE: DashboardPreset = {
  urgencyLabels: {
    now: 'Zuerst',
    week: 'Als Nächstes',
    month: 'Wenn Sie Zeit haben',
    later: 'Irgendwann',
  },
  tasks: PREPARE_TASKS,
  documents: PREPARE_DOCUMENTS,
  documentsHint: 'Das gehört in den Ordner, den Ihre Familie im Ernstfall findet.',
  familyHint:
    'Vorsorge wirkt nur, wenn jemand davon weiß. Tragen Sie ein, wer im Ernstfall handeln soll.',
};

export const PRESETS: Record<OnboardingMode, DashboardPreset> = {
  [MODE_AFTER_DEATH]: AFTER_DEATH,
  [MODE_PREPARE]: PREPARE,
};
