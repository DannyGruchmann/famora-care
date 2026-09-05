import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { Button } from '@/app/components/button/button.component';
import { emptyPersonDraft, type PersonDraft } from '../tree.types';
import { checkYears, parseYear, yearToInput } from '../tree.years';

/**
 * The four things a person in the tree has. One form for entering somebody and for correcting them
 * afterwards, because the two differ in their buttons, not in their fields.
 *
 * The year of death only appears once "verstorben" is ticked. The database refuses the other
 * combination outright, and a field that cannot be saved should not be on the screen.
 */
@Component({
  selector: 'famora-person-form',
  imports: [Button],
  templateUrl: './person-form.component.html',
  styleUrl: './person-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonForm {
  /** Prefix for the field ids — an edit form and an add form can be open at the same time. */
  readonly formId = input.required<string>();
  readonly value = input<PersonDraft>(emptyPersonDraft());
  readonly submitLabel = input('Speichern');
  readonly busy = input(false);
  /** Set when the form replaced the thing that opened it, so focus has somewhere to land. */
  readonly takesFocus = input(false);

  readonly submitted = output<PersonDraft>();
  readonly cancelled = output<void>();

  /** Each follows the input until somebody types; their entry then wins until the input changes. */
  protected readonly name = linkedSignal(() => this.value().name);
  protected readonly birthYear = linkedSignal(() => yearToInput(this.value().birthYear));
  protected readonly deceased = linkedSignal(() => this.value().deceased);
  protected readonly deathYear = linkedSignal(() => yearToInput(this.value().deathYear));

  /** Read once: a form open across midnight on New Year's Eve is not a case worth handling. */
  private readonly thisYear = new Date().getFullYear();

  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  protected readonly draft = computed((): PersonDraft => ({
    name: this.name(),
    birthYear: parseYear(this.birthYear()),
    deceased: this.deceased(),
    deathYear: this.deceased() ? parseYear(this.deathYear()) : null,
  }));

  protected readonly error = computed(() => checkYears(this.draft(), this.thisYear));

  protected readonly canSubmit = computed(
    () => this.draft().name.trim() !== '' && this.error() === undefined && !this.busy(),
  );

  constructor() {
    afterNextRender(() => this.focusNameWhenAsked());
  }

  protected fieldId(field: string): string {
    return `${this.formId()}-${field}`;
  }

  protected onNameInput(event: Event): void {
    this.name.set(readValue(event));
  }

  protected onBirthYearInput(event: Event): void {
    this.birthYear.set(readValue(event));
  }

  protected onDeathYearInput(event: Event): void {
    this.deathYear.set(readValue(event));
  }

  protected onDeceasedChange(event: Event): void {
    this.deceased.set((event.target as HTMLInputElement).checked);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.canSubmit()) return;

    this.submitted.emit(this.draft());
  }

  private focusNameWhenAsked(): void {
    if (!this.takesFocus()) return;

    this.nameInput().nativeElement.focus();
  }
}

function readValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}
