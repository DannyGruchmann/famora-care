import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'famora-hero-section',
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSection {}
