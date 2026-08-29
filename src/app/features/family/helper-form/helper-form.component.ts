import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Button } from '@/app/components/button/button.component';
import { RELATIONS } from '../family.relations';
import {
  DEFAULT_RELATION,
  emptyHelperDraft,
  type HelperDraft,
  type Relation,
} from '../family.types';

/**
 * 'add' stays open at the bottom of the list and has nothing to cancel or delete; 'edit' takes the
 * place of one row and needs a way back out of both.
 */
export type HelperFormMode = 'add' | 'edit';

/**
 * Name, relation and the deceased flag — the same three fields whether somebody is being entered
 * for the first time or corrected afterwards, which is why there is one form and not two.
 */
@Component({
  selector: 'famora-helper-form',
  imports: [Button],
  templateUrl: './helper-form.component.html',
  styleUrl: './helper-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelperForm {
  /** Prefix for the field ids — several of these forms can sit on one page. */
  readonly formId = input.required<string>();
  readonly mode = input<HelperFormMode>('add');
  readonly value = input<HelperDraft>(emptyHelperDraft());

  readonly submitted = output<HelperDraft>();
  readonly cancelled = output<void>();
  readonly deleted = output<void>();

  protected readonly relations = RELATIONS;

  protected readonly name = signal('');
  protected readonly relation = signal<Relation>(DEFAULT_RELATION);
  protected readonly deceased = signal(false);

  protected readonly isEditing = computed(() => this.mode() === 'edit');
  protected readonly submitLabel = computed(() => (this.isEditing() ? 'Speichern' : 'Hinzufügen'));
  protected readonly isEmpty = computed(() => this.name().trim() === '');

  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    // Also what clears the add form after a save: the section hands back a fresh draft, and a new
    // object is what makes this run again.
    effect(() => {
      const draft = this.value();

      this.name.set(draft.name);
      this.relation.set(draft.relation);
      this.deceased.set(draft.deceased);
    });

    afterNextRender(() => this.focusNameWhenEditing());
  }

  /**
   * An edit form takes the place of the row whose button opened it, so that button is gone by the
   * time this renders and focus would otherwise fall to the document body. Only in 'edit': the add
   * form is there from the start and nobody asked for it.
   */
  private focusNameWhenEditing(): void {
    if (!this.isEditing()) return;

    this.nameInput().nativeElement.focus();
  }

  protected fieldId(field: string): string {
    return `${this.formId()}-${field}`;
  }

  protected onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  protected onRelationChange(event: Event): void {
    this.relation.set((event.target as HTMLSelectElement).value as Relation);
  }

  protected onDeceasedChange(event: Event): void {
    this.deceased.set((event.target as HTMLInputElement).checked);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.isEmpty()) return;

    this.submitted.emit({
      name: this.name(),
      relation: this.relation(),
      deceased: this.deceased(),
    });
  }
}
