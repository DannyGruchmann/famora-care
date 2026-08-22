import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const RADIUS = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

@Component({
  selector: 'famora-progress-ring',
  templateUrl: './progress-ring.component.html',
  styleUrl: './progress-ring.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressRing {
  /** Completion in percent, 0 to 100. */
  readonly rate = input.required<number>();

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;

  protected readonly offset = computed(() => CIRCUMFERENCE * (1 - this.rate() / 100));
}
