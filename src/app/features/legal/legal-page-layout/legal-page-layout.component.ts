import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { IconButton } from '@/app/components/icon-button/icon-button.component';
import { ROUTES } from '@/app/routes.constants';
import { LEGAL_LAST_UPDATED } from '../legal.data';

/**
 * Frame for imprint and privacy policy: the same calm reading page as the rest of the app, only
 * without a sticky CTA — there is nothing to get done here.
 */
@Component({
  selector: 'famora-legal-page-layout',
  imports: [IconButton, LucideArrowLeft],
  templateUrl: './legal-page-layout.component.html',
  styleUrl: './legal-page-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPageLayout {
  readonly heading = input.required<string>();
  readonly intro = input.required<string>();

  private readonly location = inject(Location);
  private readonly router = inject(Router);

  protected readonly lastUpdated = LEGAL_LAST_UPDATED;

  /**
   * Back means where the user came from — out of the registration and back into it, with the
   * input from before. Only when this page is the first entry in the history (bookmark, shared
   * link) is there no "before": going back would then throw the user out of the app entirely.
   *
   * React exposed that as location.key === 'default'; Angular records a navigationId in the
   * history state instead, which starts at 1 for the first entry.
   */
  protected async goBack(): Promise<void> {
    if (this.isFirstHistoryEntry()) {
      await this.router.navigateByUrl(ROUTES.landing);
      return;
    }

    this.location.back();
  }

  private isFirstHistoryEntry(): boolean {
    const state = this.location.getState() as { navigationId?: number } | null;

    return (state?.navigationId ?? 1) <= 1;
  }
}
