import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideArrowLeft } from '@lucide/angular';
import { IconButton } from '@/app/components/icon-button/icon-button.component';

/**
 * The heading input is deliberately not called `title`: that is a global HTML attribute and would
 * additionally surface as a tooltip on the host element.
 */
@Component({
  selector: 'famora-dashboard-app-bar',
  imports: [IconButton, LucideArrowLeft],
  templateUrl: './dashboard-app-bar.component.html',
  styleUrl: './dashboard-app-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardAppBar {
  readonly heading = input.required<string>();

  readonly back = output<void>();
}
