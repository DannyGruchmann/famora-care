import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const SCRIPT_ID = 'cf-turnstile-script';

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render(container: HTMLElement, options: TurnstileRenderOptions): string;
      reset(widgetId: string): void;
      remove(widgetId: string): void;
    };
  }
}

/** Resolves once window.turnstile exists, whether this call loaded the script or an earlier one did. */
function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (document.getElementById(SCRIPT_ID)) return waitForTurnstile();

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve(), { once: true });
    document.head.appendChild(script);
  });
}

function waitForTurnstile(): Promise<void> {
  return new Promise((resolve) => {
    const poll = (): void => (window.turnstile ? resolve() : void setTimeout(poll, 50));
    poll();
  });
}

/**
 * Cloudflare's bot check for the two public forms that can trigger a Supabase Auth call without a
 * signed-in session: registration and password-reset requests. Supabase verifies the resulting
 * token itself server-side against the secret key configured in its dashboard — this component
 * only has to render the widget and hand the token upward.
 */
@Component({
  selector: 'famora-turnstile-widget',
  templateUrl: './turnstile-widget.component.html',
  styleUrl: './turnstile-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnstileWidget {
  readonly siteKey = input.required<string>();
  readonly verified = output<string>();

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');
  private readonly destroyRef = inject(DestroyRef);
  private widgetId: string | null = null;

  constructor() {
    afterNextRender(() => void this.renderWidget());
    this.destroyRef.onDestroy(() => this.removeWidget());
  }

  /** After a failed submit: the token was either consumed or never valid, either way stale now. */
  reset(): void {
    if (this.widgetId !== null) window.turnstile?.reset(this.widgetId);
  }

  /**
   * Turnstile polls for its container on an interval of its own and does not notice when Angular
   * removes it on a route change — it then logs "Cannot find Widget" for the rest of the session.
   * Handing the widget back on destroy is what stops that.
   */
  private removeWidget(): void {
    if (this.widgetId === null) return;

    window.turnstile?.remove(this.widgetId);
    this.widgetId = null;
  }

  private async renderWidget(): Promise<void> {
    await loadTurnstileScript();

    this.widgetId =
      window.turnstile?.render(this.container().nativeElement, {
        sitekey: this.siteKey(),
        callback: (token) => this.verified.emit(token),
        'expired-callback': () => this.verified.emit(''),
        'error-callback': () => this.verified.emit(''),
      }) ?? null;
  }
}
