import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const SCRIPT_ID = 'cf-turnstile-script';

/**
 * How long a script tag injected by another instance of this component may take. Only that case
 * polls at all; a tag this instance created reports back through its own load and error events.
 */
const LOAD_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 50;

const UNAVAILABLE_TEXT =
  'Die Sicherheitsprüfung ließ sich nicht laden. Häufig liegt das an einem Werbeblocker oder an einer strengen Firewall im Netzwerk.';
const FAILED_TEXT = 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuchen Sie es erneut.';

/**
 * Why the widget cannot be solved.
 *
 * 'unavailable' means Cloudflare's script never arrived, so there is no error code to show — the
 * widget never got far enough to produce one. 'failed' always carries the code Turnstile reported,
 * which is the only thing that tells 110200 (domain not authorised, a configuration problem) apart
 * from 200500 (the iframe is blocked, a problem on the visitor's side).
 */
type TurnstileProblem = { kind: 'unavailable' } | { kind: 'failed'; code: string };

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  /** Returning true tells Turnstile the error is handled and stops it logging on its own. */
  'error-callback': (code: string) => boolean;
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

/** Resolves true once window.turnstile exists, false if the script never arrives. */
function loadTurnstileScript(): Promise<boolean> {
  if (window.turnstile !== undefined) return Promise.resolve(true);
  if (document.getElementById(SCRIPT_ID) !== null) return waitForTurnstile();

  return injectTurnstileScript();
}

/**
 * A blocked request fires 'error' — without that listener the promise never settles, which is
 * exactly what used to leave a firewalled visitor staring at a disabled button. An ad blocker that
 * answers with an empty 200 instead fires 'load' without defining the global, so the load path
 * checks for it rather than assuming it.
 */
function injectTurnstileScript(): Promise<boolean> {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve(window.turnstile !== undefined), { once: true });
    script.addEventListener('error', () => resolve(false), { once: true });
    document.head.appendChild(script);
  });
}

function waitForTurnstile(): Promise<boolean> {
  const deadline = Date.now() + LOAD_TIMEOUT_MS;

  return new Promise((resolve) => {
    pollForTurnstile(deadline, resolve);
  });
}

function pollForTurnstile(deadline: number, resolve: (found: boolean) => void): void {
  if (window.turnstile !== undefined) {
    resolve(true);
    return;
  }

  if (Date.now() >= deadline) {
    resolve(false);
    return;
  }

  setTimeout(() => pollForTurnstile(deadline, resolve), POLL_INTERVAL_MS);
}

/** Only for a retry: a tag that already failed would keep the loader from ever trying again. */
function removeTurnstileScript(): void {
  document.getElementById(SCRIPT_ID)?.remove();
}

/**
 * Cloudflare's bot check for the three public forms that can trigger a Supabase Auth call without
 * a signed-in session: sign-in, registration and password-reset requests. Supabase verifies the
 * resulting token itself server-side against the secret key configured in its dashboard — this
 * component only has to render the widget and hand the token upward.
 *
 * It also owns the explanation when that fails. Famora is used by strangers, and somebody behind a
 * firewall that blocks challenges.cloudflare.com otherwise meets a permanently greyed-out button
 * with nothing saying why. The notice lives here rather than in the three pages so it exists once,
 * and so it sits where the missing widget is instead of in the layout's submit-error slot, which
 * pulls focus on purpose and would tear the visitor out of the email field before they had typed.
 */
@Component({
  selector: 'famora-turnstile-widget',
  templateUrl: './turnstile-widget.component.html',
  styleUrl: './turnstile-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnstileWidget {
  readonly siteKey = input.required<string>();

  /** Only ever a real token. */
  readonly verified = output<string>();
  /**
   * The token is gone — expired, or the widget failed. Whoever holds it has to drop it, which is
   * what keeps the submit button disabled until Turnstile has been solved again.
   */
  readonly cleared = output<void>();

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');
  private readonly destroyRef = inject(DestroyRef);
  private widgetId: string | null = null;
  private isDestroyed = false;

  protected readonly problem = signal<TurnstileProblem | null>(null);

  protected readonly message = computed(() => {
    const problem = this.problem();
    if (problem === null) return undefined;

    return problem.kind === 'unavailable' ? UNAVAILABLE_TEXT : FAILED_TEXT;
  });

  /** Absent for 'unavailable': there is no Cloudflare code when the script never ran. */
  protected readonly errorCode = computed(() => {
    const problem = this.problem();

    return problem?.kind === 'failed' ? problem.code : undefined;
  });

  constructor() {
    afterNextRender(() => void this.renderWidget());
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      this.removeWidget();
    });
  }

  /** After a failed submit: the token was either consumed or never valid, either way stale now. */
  reset(): void {
    if (this.widgetId !== null) window.turnstile?.reset(this.widgetId);
  }

  /**
   * Starts over from scratch. Whoever switches their ad blocker off gets back in without reloading
   * the page — and a permanent problem such as 110200 simply fails again, which costs nothing and
   * is why the button is offered for every kind of failure rather than only the recoverable ones.
   */
  protected retry(): void {
    this.problem.set(null);
    this.removeWidget();
    if (window.turnstile === undefined) removeTurnstileScript();

    void this.renderWidget();
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
    const isLoaded = await loadTurnstileScript();
    // The await above outlives a route change, and rendering into a detached container is what
    // produces the "Cannot find Widget" logging the removal above exists to prevent.
    if (this.isDestroyed) return;

    if (!isLoaded || window.turnstile === undefined) {
      this.reportProblem({ kind: 'unavailable' });
      return;
    }

    this.widgetId = window.turnstile.render(this.container().nativeElement, this.renderOptions());
  }

  private renderOptions(): TurnstileRenderOptions {
    return {
      sitekey: this.siteKey(),
      callback: (token) => this.onSolved(token),
      // No notice: Turnstile shows an expiry state of its own and challenges again by itself.
      'expired-callback': () => this.cleared.emit(),
      'error-callback': (code) => this.onFailed(code),
    };
  }

  private onSolved(token: string): void {
    this.problem.set(null);
    this.verified.emit(token);
  }

  private onFailed(code: string): boolean {
    this.reportProblem({ kind: 'failed', code });

    return true;
  }

  private reportProblem(problem: TurnstileProblem): void {
    this.problem.set(problem);
    this.cleared.emit();
  }
}
