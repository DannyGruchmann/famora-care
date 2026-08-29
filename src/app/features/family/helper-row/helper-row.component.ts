import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { LucidePencil } from '@lucide/angular';
import { findRelation } from '../family.relations';
import type { HelperWithLoad } from '../family.types';

function describeLoad(openTaskCount: number): string {
  if (openTaskCount === 0) return 'Noch keine Aufgabe übernommen';
  if (openTaskCount === 1) return '1 offene Aufgabe';

  return `${openTaskCount} offene Aufgaben`;
}

/** One person as the list shows them. Read-only — editing opens the form in place of this row. */
@Component({
  selector: 'famora-helper-row',
  imports: [LucidePencil],
  templateUrl: './helper-row.component.html',
  styleUrl: './helper-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelperRow {
  readonly person = input.required<HelperWithLoad>();

  readonly edit = output<void>();

  private readonly editButton = viewChild.required<ElementRef<HTMLButtonElement>>('editButton');

  /**
   * Lets the section put focus back on the button that opened the form once it closes again.
   * Without it focus lands on the document body and a keyboard user starts over at the top.
   */
  focus(): void {
    this.editButton().nativeElement.focus();
  }

  /** Relation first, because that is what the list is now sorted and read by. */
  protected readonly description = computed(() => {
    const person = this.person();
    const relation = findRelation(person.relation).optionLabel;
    if (person.deceased) return `${relation} · verstorben`;

    return `${relation} · ${describeLoad(person.openTaskCount)}`;
  });
}
