import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@/app/components/button/button.component';
import { ROUTES } from '@/app/routes.constants';

@Component({
  selector: 'famora-not-found-page',
  imports: [Button],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  private readonly router = inject(Router);

  protected async goHome(): Promise<void> {
    await this.router.navigateByUrl(ROUTES.landing);
  }
}
