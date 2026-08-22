import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LegalPageLayout } from '../legal-page-layout/legal-page-layout.component';
import { LegalSection } from '../legal-section/legal-section.component';
import { PROVIDER, SUPERVISORY_AUTHORITY } from '../legal.data';

@Component({
  selector: 'famora-privacy-page',
  imports: [LegalPageLayout, LegalSection],
  templateUrl: './privacy-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPage {
  protected readonly provider = PROVIDER;
  protected readonly authority = SUPERVISORY_AUTHORITY;
}
