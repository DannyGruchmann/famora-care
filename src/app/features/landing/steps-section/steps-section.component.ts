import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ThreadSection } from '@/app/components/thread-section/thread-section.component';

interface Step {
  number: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Ein paar ruhige Fragen',
    description:
      'Keine Formulare. Eine Frage nach der anderen, damit wir Ihre Situation verstehen.',
  },
  {
    number: '02',
    title: 'Ihre persönliche Checkliste',
    description:
      'Sortiert nach Dringlichkeit: was heute zählt, was diese Woche, was später Zeit hat.',
  },
  {
    number: '03',
    title: 'Gemeinsam abarbeiten',
    description: 'Aufgaben in der Familie verteilen, Dokumente ablegen, Fristen im Blick behalten.',
  },
];

@Component({
  selector: 'famora-steps-section',
  imports: [ThreadSection],
  templateUrl: './steps-section.component.html',
  styleUrl: './steps-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepsSection {
  protected readonly steps = STEPS;
}
