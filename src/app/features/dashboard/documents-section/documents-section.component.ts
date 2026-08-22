import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { RequiredDocument } from '../dashboard.types';

@Component({
  selector: 'famora-documents-section',
  templateUrl: './documents-section.component.html',
  styleUrl: './documents-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsSection {
  readonly documents = input.required<RequiredDocument[]>();
  readonly hint = input.required<string>();
}
