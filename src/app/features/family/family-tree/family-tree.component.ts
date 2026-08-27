import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { FamilyTree } from '../family.tree';

/**
 * The family around one person, drawn as generations stacked from the oldest down.
 *
 * Deliberately no diagram library and no horizontal layout: this has to hold at 320px and come
 * out of a printer, and both rule out the wide branching drawing a genealogy tool would produce.
 * Rows carry their own heading, so the tree reads without deducing anything from position —
 * which is also what makes it work for a screen reader.
 *
 * Purely presentational, so the dashboard and the emergency sheet can both show it.
 */
@Component({
  selector: 'famora-family-tree',
  templateUrl: './family-tree.component.html',
  styleUrl: './family-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyTreeView {
  readonly tree = input.required<FamilyTree>();
  /**
   * Shown while nobody is entered. Empty means "say nothing": on paper an invitation to fill the
   * tree in is useless, and the sheet only prints the tree once it holds somebody anyway.
   */
  readonly emptyText = input('');
}
