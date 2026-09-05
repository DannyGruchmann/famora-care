import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@/app/components/button/button.component';
import { treePath } from '@/app/routes.constants';
import { MyTreesService } from '../my-trees.service';
import { describeTree } from '../tree.labels';

const INTRO =
  'Halten Sie fest, wer zur Familie gehört – mit Geburts- und Sterbejahren. Der Stammbaum gehört zu Ihrem Konto und lässt sich später mit der Familie teilen.';

/**
 * The way into the tree, from inside a folder. It has to work on day one, when no tree exists yet:
 * one sentence and one button, not an empty canvas or a placeholder diagram.
 *
 * Creating one is a single press. Asking for a name first would be a form standing between
 * somebody and the thing they wanted; the name is editable in the tree itself.
 */
@Component({
  selector: 'famora-tree-summary-card',
  imports: [Button],
  templateUrl: './tree-summary-card.component.html',
  styleUrl: './tree-summary-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeSummaryCard {
  private readonly router = inject(Router);

  protected readonly trees = inject(MyTreesService);
  protected readonly intro = INTRO;

  protected readonly summaryLine = computed(() => {
    const summary = this.trees.summary();

    return summary === null ? '' : describeTree(summary.personCount, summary.generationCount);
  });

  protected readonly createLabel = computed(() =>
    this.trees.isCreating() ? 'Wird angelegt …' : 'Stammbaum anlegen',
  );

  protected async createTree(): Promise<void> {
    const tree = await this.trees.createFirstTree();
    if (tree === null) return;

    await this.router.navigateByUrl(treePath(tree.id));
  }

  protected async openTree(): Promise<void> {
    const tree = this.trees.firstTree();
    if (tree === null) return;

    await this.router.navigateByUrl(treePath(tree.id));
  }
}
