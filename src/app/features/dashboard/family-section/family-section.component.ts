import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LucideX } from '@lucide/angular';
import { Button } from '@/app/components/button/button.component';
import type { HelperWithLoad } from '../dashboard.types';

function describeLoad(openTaskCount: number): string {
  if (openTaskCount === 0) return 'Noch keine Aufgabe übernommen';
  if (openTaskCount === 1) return '1 offene Aufgabe';

  return `${openTaskCount} offene Aufgaben`;
}

@Component({
  selector: 'famora-family-section',
  imports: [Button, LucideX],
  templateUrl: './family-section.component.html',
  styleUrl: './family-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilySection {
  readonly helpers = input.required<HelperWithLoad[]>();
  readonly hint = input.required<string>();

  readonly added = output<string>();
  readonly removed = output<string>();

  protected readonly name = signal('');

  protected readonly isEmpty = computed(() => this.name().trim() === '');

  protected readonly describeLoad = describeLoad;

  protected onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.added.emit(this.name());
    this.name.set('');
  }
}
