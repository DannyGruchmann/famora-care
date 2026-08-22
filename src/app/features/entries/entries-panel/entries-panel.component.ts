import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { EntriesStore } from '../entries.store';
import { EntrySection } from '../entry-section/entry-section.component';
import type { EntryDraft, EntryKind } from '../entry.types';

/**
 * The content of a precaution folder: five sections, one store. The page above provides the store
 * and tells it which folder to read — this component only wires the sections to it.
 */
@Component({
  selector: 'famora-entries-panel',
  imports: [EntrySection],
  templateUrl: './entries-panel.component.html',
  styleUrl: './entries-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntriesPanel {
  /** Shown above the sections — what this folder is for, in the words of the chosen path. */
  readonly hint = input.required<string>();

  protected readonly store = inject(EntriesStore);

  protected onAdd(kind: EntryKind, draft: EntryDraft): void {
    void this.store.addEntry(kind, draft);
  }

  protected onChange(change: { id: string; draft: EntryDraft }): void {
    void this.store.updateEntry(change.id, change.draft);
  }

  protected onRemove(id: string): void {
    void this.store.removeEntry(id);
  }
}
