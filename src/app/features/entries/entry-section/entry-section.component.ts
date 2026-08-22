import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LucidePlus } from '@lucide/angular';
import { EntryForm } from '../entry-form/entry-form.component';
import { EntryRow } from '../entry-row/entry-row.component';
import { emptyDraft, toDraft, type EntryDraft, type FolderEntry } from '../entry.types';
import type { EntryKindConfig } from '../entry.kinds';

/** id of the entry being edited, or 'new' while the add form is open. */
type OpenForm = { id: string } | { id: 'new' } | null;

@Component({
  selector: 'famora-entry-section',
  imports: [LucidePlus, EntryForm, EntryRow],
  templateUrl: './entry-section.component.html',
  styleUrl: './entry-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntrySection {
  readonly config = input.required<EntryKindConfig>();
  readonly entries = input.required<FolderEntry[]>();
  readonly isSaving = input(false);

  readonly added = output<EntryDraft>();
  readonly changed = output<{ id: string; draft: EntryDraft }>();
  readonly removed = output<string>();

  /** Only ever one form at a time — two open forms in one section invite editing the wrong row. */
  private readonly openForm = signal<OpenForm>(null);

  protected readonly isAdding = computed(() => this.openForm()?.id === 'new');

  protected readonly editingId = computed(() => {
    const open = this.openForm();

    return open === null || open.id === 'new' ? null : open.id;
  });

  protected readonly editingDraft = computed((): EntryDraft => {
    const entry = this.entries().find((item) => item.id === this.editingId());

    return entry === undefined ? emptyDraft() : toDraft(entry);
  });

  protected openAddForm(): void {
    this.openForm.set({ id: 'new' });
  }

  protected openEditForm(entryId: string): void {
    this.openForm.set({ id: entryId });
  }

  protected closeForm(): void {
    this.openForm.set(null);
  }

  protected onAdd(draft: EntryDraft): void {
    this.added.emit(draft);
    this.closeForm();
  }

  protected onChange(id: string, draft: EntryDraft): void {
    this.changed.emit({ id, draft });
    this.closeForm();
  }

  protected onRemove(id: string): void {
    this.removed.emit(id);
    this.closeForm();
  }
}
