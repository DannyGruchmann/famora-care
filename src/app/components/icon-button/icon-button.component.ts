import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconButtonTone = 'light' | 'dark';

/** Like Button, clicks bubble up to the host — no output to forward. */
@Component({
  selector: 'famora-icon-button',
  templateUrl: './icon-button.component.html',
  styleUrl: './icon-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconButton {
  readonly label = input.required<string>();
  readonly tone = input<IconButtonTone>('light');

  readonly toneClass = computed(() => `icon-button--${this.tone()}`);
}
