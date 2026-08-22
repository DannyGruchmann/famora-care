import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'famora-sticky-cta',
  templateUrl: './sticky-cta.component.html',
  styleUrl: './sticky-cta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StickyCta {
  readonly note = input<string>();
}
