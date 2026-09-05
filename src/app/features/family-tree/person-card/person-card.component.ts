import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { describeLifespan } from '../tree.labels';
import type { TreePerson } from '../tree.types';

/**
 * One person on the canvas. A real button, so the tree can be walked with Tab and opened with
 * Enter — the canvas around it is a picture, this is the part anybody can operate.
 *
 * Clicks bubble to the host, like Button and IconButton, so the canvas listens there.
 */
@Component({
  selector: 'famora-person-card',
  templateUrl: './person-card.component.html',
  styleUrl: './person-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonCard {
  readonly person = input.required<TreePerson>();
  /** The person the tree opens on. Marked with a ring, never with a filled background. */
  readonly isRoot = input(false);
  readonly isSelected = input(false);

  protected readonly lifespan = computed(() => describeLifespan(this.person()));
}
