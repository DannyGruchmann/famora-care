import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideLoaderCircle } from '@lucide/angular';

@Component({
  selector: 'famora-loading-screen',
  imports: [LucideLoaderCircle],
  templateUrl: './loading-screen.component.html',
  styleUrl: './loading-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingScreen {
  /** Read out by screen readers while the spinner itself stays decorative. */
  readonly label = input.required<string>();
}
