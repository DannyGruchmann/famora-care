import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'famora-thread-section',
  templateUrl: './thread-section.component.html',
  styleUrl: './thread-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreadSection {
  readonly label = input.required<string>();
}
