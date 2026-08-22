import { ChangeDetectionStrategy, Component, input, linkedSignal } from '@angular/core';
import {
  LucideChevronDown,
  LucideFolderOpen,
  LucideListChecks,
  LucideNotebookPen,
  LucideUsers,
} from '@lucide/angular';

export type SectionCardIcon = 'checklist' | 'documents' | 'family' | 'register';

/**
 * Collapsible section of the dashboard. `heading` rather than `title`: the latter is a global HTML
 * attribute and would additionally surface as a tooltip on the host element.
 */
@Component({
  selector: 'famora-section-card',
  imports: [LucideListChecks, LucideFolderOpen, LucideUsers, LucideNotebookPen, LucideChevronDown],
  templateUrl: './section-card.component.html',
  styleUrl: './section-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionCard {
  readonly icon = input.required<SectionCardIcon>();
  readonly heading = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly defaultOpen = input(false);

  /** Follows the input until the user decides for themselves; their choice then wins. */
  protected readonly open = linkedSignal(() => this.defaultOpen());

  protected toggle(): void {
    this.open.update((current) => !current);
  }
}
