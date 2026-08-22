import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideLock, LucideServer, LucideUserX } from '@lucide/angular';
import { ThreadSection } from '@/app/components/thread-section/thread-section.component';

type TrustIcon = 'server' | 'lock' | 'user-x';

interface TrustPoint {
  icon: TrustIcon;
  title: string;
  description: string;
}

const TRUST_POINTS: TrustPoint[] = [
  {
    icon: 'server',
    title: 'Gespeichert in der EU',
    description: 'Ihre Ordner liegen auf Servern in der Europäischen Union.',
  },
  {
    icon: 'lock',
    title: 'Nur für Ihr Konto',
    description: 'Eine Zugriffskontrolle in der Datenbank trennt Ihre Ordner von allen anderen.',
  },
  {
    icon: 'user-x',
    title: 'Kein Weiterverkauf',
    description: 'Keine Werbung, kein Datenhandel. Nie.',
  },
];

@Component({
  selector: 'famora-trust-section',
  imports: [ThreadSection, LucideLock, LucideServer, LucideUserX],
  templateUrl: './trust-section.component.html',
  styleUrl: './trust-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustSection {
  protected readonly points = TRUST_POINTS;
}
