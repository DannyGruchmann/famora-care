import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserMenu } from '@/app/features/auth/user-menu/user-menu.component';

@Component({
  selector: 'famora-root',
  imports: [RouterOutlet, UserMenu],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
