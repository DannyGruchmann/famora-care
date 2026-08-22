import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucidePencil } from '@lucide/angular';
import type { EntryKindConfig } from '../entry.kinds';
import type { FolderEntry } from '../entry.types';

/** One line of a section: what it is, where it is, who helps. Read-only — editing opens a form. */
@Component({
  selector: 'famora-entry-row',
  imports: [LucidePencil],
  templateUrl: './entry-row.component.html',
  styleUrl: './entry-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryRow {
  readonly entry = input.required<FolderEntry>();
  readonly config = input.required<EntryKindConfig>();

  readonly edit = output<void>();

  /** The label the reference carries in this section — "Wo liegt es?", "Benutzername", … */
  protected readonly referenceLabel = computed(() => this.config().referenceLabel);

  protected readonly hasReference = computed(
    () => this.referenceLabel() !== undefined && this.entry().reference !== '',
  );
}
