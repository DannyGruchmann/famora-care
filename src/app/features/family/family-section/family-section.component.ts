import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LucideX } from '@lucide/angular';
import { Button } from '@/app/components/button/button.component';
import { FamilyTreeView } from '../family-tree/family-tree.component';
import { DEFAULT_RELATION, findRelation, RELATIONS } from '../family.relations';
import type { FamilyTree } from '../family.tree';
import type { HelperDraft, HelperWithLoad, Relation } from '../family.types';

const EMPTY_TREE =
  'Tragen Sie unten ein, wer zur Familie gehört – der Stammbaum füllt sich mit jeder Person.';

function describeLoad(openTaskCount: number): string {
  if (openTaskCount === 0) return 'Noch keine Aufgabe übernommen';
  if (openTaskCount === 1) return '1 offene Aufgabe';

  return `${openTaskCount} offene Aufgaben`;
}

/** Relation first, because that is what the list is now sorted and read by. */
function describePerson(person: HelperWithLoad): string {
  const relation = findRelation(person.relation).optionLabel;
  if (person.deceased) return `${relation} · verstorben`;

  return `${relation} · ${describeLoad(person.openTaskCount)}`;
}

/**
 * Who belongs to the folder: the tree above, the same people as a list below, and one form that
 * feeds both. One entry per person on purpose — a separate tree would mean typing every aunt
 * twice and having no answer for why she is in one place and not the other.
 */
@Component({
  selector: 'famora-family-section',
  imports: [Button, FamilyTreeView, LucideX],
  templateUrl: './family-section.component.html',
  styleUrl: './family-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilySection {
  readonly helpers = input.required<HelperWithLoad[]>();
  readonly hint = input.required<string>();
  readonly tree = input.required<FamilyTree>();

  readonly added = output<HelperDraft>();
  readonly removed = output<string>();

  protected readonly relations = RELATIONS;
  protected readonly emptyTree = EMPTY_TREE;
  protected readonly describePerson = describePerson;

  protected readonly name = signal('');
  protected readonly relation = signal<Relation>(DEFAULT_RELATION);
  protected readonly deceased = signal(false);

  protected readonly isEmpty = computed(() => this.name().trim() === '');

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
    this.added.emit({
      name: this.name(),
      relation: this.relation(),
      deceased: this.deceased(),
    });
    this.resetForm();
  }

  /** The relation stays: whoever just entered one child is most likely entering a second. */
  private resetForm(): void {
    this.name.set('');
    this.deceased.set(false);
  }
}
