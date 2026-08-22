import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LegalPageLayout } from '../legal-page-layout/legal-page-layout.component';
import { LegalSection } from '../legal-section/legal-section.component';
import { PROVIDER } from '../legal.data';

@Component({
  selector: 'famora-imprint-page',
  imports: [LegalPageLayout, LegalSection],
  templateUrl: './imprint-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImprintPage {
  protected readonly provider = PROVIDER;
}
