import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MIN_PASSWORD_LENGTH } from '../auth.constants';

const SEGMENT_COUNT = 4;

interface StrengthLevel {
  label: string;
  /** The filled segments and the caption do not always share a colour — see level 2. */
  barTone: 'danger' | 'accent' | 'success';
  textTone: 'danger' | 'muted' | 'success';
}

const LEVELS: StrengthLevel[] = [
  { label: 'Zu kurz', barTone: 'danger', textTone: 'danger' },
  { label: 'Schwach', barTone: 'danger', textTone: 'danger' },
  { label: 'Geht so', barTone: 'accent', textTone: 'muted' },
  { label: 'Gut', barTone: 'success', textTone: 'success' },
  { label: 'Stark', barTone: 'success', textTone: 'success' },
];

/**
 * A rough impression for the user's benefit, not a security check. Whether a password really
 * holds up is decided by the comparison against known leaks on the server.
 */
function scorePassword(value: string): number {
  if (value.length < MIN_PASSWORD_LENGTH) return value.length === 0 ? 0 : 1;

  let score = 2;
  if (value.length >= 16) score += 1;
  if (/[a-zäöüß]/.test(value) && /[A-ZÄÖÜ]/.test(value) && /\d/.test(value)) score += 1;

  return Math.min(score, SEGMENT_COUNT);
}

@Component({
  selector: 'famora-password-strength',
  templateUrl: './password-strength.component.html',
  styleUrl: './password-strength.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordStrength {
  readonly value = input.required<string>();

  protected readonly segments = Array.from({ length: SEGMENT_COUNT }, (_, index) => index);

  protected readonly score = computed(() => scorePassword(this.value()));
  private readonly level = computed(() => LEVELS[this.score()]);

  protected readonly textToneClass = computed(
    () => `password-strength__caption--${this.level().textTone}`,
  );

  protected readonly caption = computed(() =>
    this.value().length === 0 ? '' : `Sicherheit: ${this.level().label}`,
  );

  protected segmentClass(index: number): string {
    return index < this.score()
      ? `password-strength__segment--${this.level().barTone}`
      : 'password-strength__segment--empty';
  }
}
