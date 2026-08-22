import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A section of a legal text. Colour, line height and spacing sit on the container, so the
 * paragraphs inside need no classes of their own.
 */
@Component({
  selector: 'famora-legal-section',
  templateUrl: './legal-section.component.html',
  styleUrl: './legal-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalSection {
  readonly heading = input.required<string>();
}
