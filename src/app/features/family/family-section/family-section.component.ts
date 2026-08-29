import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { FamilyTreeView } from '../family-tree/family-tree.component';
import { HelperForm } from '../helper-form/helper-form.component';
import { HelperRow } from '../helper-row/helper-row.component';
import type { FamilyTree } from '../family.tree';
import {
  emptyHelperDraft,
  toHelperDraft,
  type HelperDraft,
  type HelperWithLoad,
} from '../family.types';

const EMPTY_TREE =
  'Tragen Sie unten ein, wer zur Familie gehört – der Stammbaum füllt sich mit jeder Person.';

/**
 * Whether two drafts describe the same person. Guards the open edit form against being refilled:
 * `helpers` carries the open-task count, so ticking a checklist item elsewhere on the page hands
 * this section a brand-new array, and without this every such change would overwrite what somebody
 * had just typed into the form.
 */
function isSameDraft(one: HelperDraft, other: HelperDraft): boolean {
  return (
    one.name === other.name && one.relation === other.relation && one.deceased === other.deceased
  );
}

/**
 * Who belongs to the folder: the tree above, the same people as a list below, and one form that
 * feeds both. One entry per person on purpose — a separate tree would mean typing every aunt
 * twice and having no answer for why she is in one place and not the other.
 *
 * Editing happens in place of a row rather than in a dialog, the same way entry-section does it.
 * That it is possible at all matters most for folders written before the tree existed: everybody
 * in them sits under 'other', and re-entering them by hand would drop their task assignments.
 */
@Component({
  selector: 'famora-family-section',
  imports: [FamilyTreeView, HelperForm, HelperRow],
  templateUrl: './family-section.component.html',
  styleUrl: './family-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilySection {
  readonly helpers = input.required<HelperWithLoad[]>();
  readonly hint = input.required<string>();
  readonly tree = input.required<FamilyTree>();

  readonly added = output<HelperDraft>();
  readonly changed = output<{ id: string; draft: HelperDraft }>();
  readonly removed = output<string>();

  protected readonly emptyTree = EMPTY_TREE;

  private readonly injector = inject(Injector);
  private readonly rows = viewChildren(HelperRow);

  /** id of the person being edited, or null while only the add form is open. */
  protected readonly editingId = signal<string | null>(null);

  /**
   * What the add form starts on. Replaced after every save so the form clears itself — and the
   * relation carries over on purpose: whoever just entered one child is likely entering a second.
   */
  protected readonly addDraft = signal<HelperDraft>(emptyHelperDraft());

  protected readonly editingDraft = computed(
    (): HelperDraft => {
      const person = this.helpers().find((entry) => entry.id === this.editingId());

      return person === undefined ? emptyHelperDraft() : toHelperDraft(person);
    },
    { equal: isSameDraft },
  );

  protected openEditForm(helperId: string): void {
    this.editingId.set(helperId);
  }

  protected closeEditForm(): void {
    const helperId = this.editingId();

    this.editingId.set(null);
    this.refocusRow(helperId);
  }

  protected onAdd(draft: HelperDraft): void {
    this.added.emit(draft);
    this.addDraft.set({ ...emptyHelperDraft(), relation: draft.relation });
  }

  protected onChange(helperId: string, draft: HelperDraft): void {
    this.changed.emit({ id: helperId, draft });
    this.closeEditForm();
  }

  /** No refocus: the row that would have taken it is the one being removed. */
  protected onRemove(helperId: string): void {
    this.removed.emit(helperId);
    this.editingId.set(null);
  }

  /** The row comes back only on the next render, so the button to focus does not exist yet here. */
  private refocusRow(helperId: string | null): void {
    if (helperId === null) return;

    afterNextRender(
      () =>
        this.rows()
          .find((row) => row.person().id === helperId)
          ?.focus(),
      { injector: this.injector },
    );
  }
}
