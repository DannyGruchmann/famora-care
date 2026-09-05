import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { LucideX } from '@lucide/angular';
import { Button } from '@/app/components/button/button.component';
import { ConfirmDialog } from '@/app/components/confirm-dialog/confirm-dialog.component';
import { IconButton } from '@/app/components/icon-button/icon-button.component';
import { PersonForm } from '../person-form/person-form.component';
import { describeAddRelative, describeLifespan, describeRelativeKind } from '../tree.labels';
import {
  emptyPersonDraft,
  toPersonDraft,
  type PersonDraft,
  type RelativeKind,
  type TreePerson,
} from '../tree.types';

/** 'view' shows the person and what can be done with them; the rest each show one form. */
type PanelMode = 'view' | 'edit' | RelativeKind;

const RELATIVE_KINDS: RelativeKind[] = ['parent', 'partner', 'child'];

const DELETE_DESCRIPTION =
  'Die Person und ihre Verbindungen werden aus dem Stammbaum entfernt. Das lässt sich nicht rückgängig machen.';

/**
 * Everything about the person the canvas has selected: their details, the three ways to attach
 * somebody new to them, and the way to remove them.
 *
 * A viewer sees the same panel without a single button — the rules live in the database, and this
 * only reflects them. Hiding the panel from a viewer would hide the years along with the buttons.
 */
@Component({
  selector: 'famora-person-panel',
  imports: [Button, ConfirmDialog, IconButton, PersonForm, LucideX],
  templateUrl: './person-panel.component.html',
  styleUrl: './person-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonPanel {
  readonly person = input.required<TreePerson>();
  readonly canEdit = input(false);
  readonly isRoot = input(false);
  readonly busy = input(false);

  readonly saved = output<PersonDraft>();
  readonly relativeAdded = output<{ kind: RelativeKind; draft: PersonDraft }>();
  readonly removed = output<void>();
  readonly rootChosen = output<void>();
  readonly closed = output<void>();

  protected readonly relativeKinds = RELATIVE_KINDS;
  protected readonly deleteDescription = DELETE_DESCRIPTION;
  protected readonly emptyDraft = emptyPersonDraft();

  /** Back to 'view' whenever the canvas selects somebody else — a half-typed form must not follow. */
  protected readonly mode = linkedSignal<TreePerson, PanelMode>({
    source: this.person,
    computation: () => 'view',
  });

  protected readonly isConfirmingDelete = linkedSignal<TreePerson, boolean>({
    source: this.person,
    computation: () => false,
  });

  protected readonly lifespan = computed(() => describeLifespan(this.person()));
  protected readonly draft = computed(() => toPersonDraft(this.person()));
  protected readonly deleteHeading = computed(() => `${this.person().name} entfernen?`);

  /** null in every mode that is not adding somebody. */
  protected readonly addingKind = computed((): RelativeKind | null => {
    const mode = this.mode();

    return mode === 'view' || mode === 'edit' ? null : mode;
  });

  protected readonly addHeading = computed(() => {
    const kind = this.addingKind();

    return kind === null ? '' : describeAddRelative(kind, this.person().name);
  });

  /** Short on the button, because three buttons in a row have no space for the long form. */
  protected shortLabel(kind: RelativeKind): string {
    return describeRelativeKind(kind);
  }

  /** The long form for screen readers, so "Kind" is not read out without saying whose. */
  protected fullLabel(kind: RelativeKind): string {
    return describeAddRelative(kind, this.person().name);
  }

  protected show(mode: PanelMode): void {
    this.mode.set(mode);
  }

  protected onSaved(draft: PersonDraft): void {
    this.saved.emit(draft);
    this.mode.set('view');
  }

  protected onRelativeSubmitted(draft: PersonDraft): void {
    const kind = this.addingKind();
    if (kind === null) return;

    this.relativeAdded.emit({ kind, draft });
    this.mode.set('view');
  }

  protected onDeleteConfirmed(): void {
    this.isConfirmingDelete.set(false);
    this.removed.emit();
  }
}
