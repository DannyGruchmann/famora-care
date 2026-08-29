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
import type { HelperWithLoad } from '../dashboard.types';
import { HelperForm } from '../helper-form/helper-form.component';
import { HelperRow } from '../helper-row/helper-row.component';

/**
 * Who is helping with this folder: everybody entered so far, and one form to add the next.
 *
 * Editing happens in place of a row rather than in a dialog, the same way entry-section does it.
 * That it is possible at all is what keeps a typo cheap: the id survives a correction, so the
 * tasks already handed to that person stay handed to them.
 */
@Component({
  selector: 'famora-family-section',
  imports: [HelperForm, HelperRow],
  templateUrl: './family-section.component.html',
  styleUrl: './family-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilySection {
  readonly helpers = input.required<HelperWithLoad[]>();
  readonly hint = input.required<string>();

  readonly added = output<string>();
  readonly renamed = output<{ id: string; name: string }>();
  readonly removed = output<string>();

  private readonly injector = inject(Injector);
  private readonly rows = viewChildren(HelperRow);

  /** id of the person being edited, or null while only the add form is open. */
  protected readonly editingId = signal<string | null>(null);

  /**
   * What the open edit form starts on. A plain string on purpose: `helpers` is a fresh array after
   * every ticked-off task, and anything coarser than the name itself would refill the form under
   * somebody's fingers while they were still typing.
   */
  protected readonly editingName = computed(
    () => this.helpers().find((entry) => entry.id === this.editingId())?.name ?? '',
  );

  protected openEditForm(helperId: string): void {
    this.editingId.set(helperId);
  }

  protected closeEditForm(): void {
    const helperId = this.editingId();

    this.editingId.set(null);
    this.refocusRow(helperId);
  }

  protected onRename(helperId: string, name: string): void {
    this.renamed.emit({ id: helperId, name });
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
