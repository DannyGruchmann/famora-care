import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TurnstileWidget } from './turnstile-widget.component';

const SITE_KEY = '0x4AAAAAAEZAMeVzjDPZne1F';
const SCRIPT_ID = 'cf-turnstile-script';
/** Domain not authorised — the one anybody meets on localhost before Cloudflare knows about it. */
const DOMAIN_ERROR_CODE = '110200';

type RenderOptions = Parameters<NonNullable<Window['turnstile']>['render']>[1];

/** Stands in for Cloudflare's api.js and keeps the options of the last render() call reachable. */
function stubTurnstile() {
  let options: RenderOptions | null = null;
  const render = vi.fn((_container: HTMLElement, given: RenderOptions) => {
    options = given;

    return 'widget-1';
  });

  window.turnstile = { render, reset: vi.fn(), remove: vi.fn() };

  return {
    render,
    lastOptions: (): RenderOptions => {
      if (options === null) throw new Error('render() was never called');

      return options;
    },
  };
}

async function renderWidget(): Promise<ComponentFixture<TurnstileWidget>> {
  const fixture = TestBed.createComponent(TurnstileWidget);
  fixture.componentRef.setInput('siteKey', SITE_KEY);
  await fixture.whenStable();
  fixture.detectChanges();

  return fixture;
}

function text(fixture: ComponentFixture<TurnstileWidget>, selector: string): string | undefined {
  const element: Element | null = fixture.nativeElement.querySelector(selector);

  return element?.textContent?.trim();
}

/**
 * jsdom does not fetch external scripts, so the injected tag never reports anything by itself.
 * Firing the event by hand is what a blocked request or an ad blocker produces in a browser.
 */
async function failInjectedScript(fixture: ComponentFixture<TurnstileWidget>): Promise<void> {
  const script = document.getElementById(SCRIPT_ID);
  if (script === null) throw new Error('the component never injected the Turnstile script');

  script.dispatchEvent(new Event('error'));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('TurnstileWidget', () => {
  afterEach(() => {
    document.getElementById(SCRIPT_ID)?.remove();
    delete window.turnstile;
    TestBed.resetTestingModule();
  });

  it('says why the widget failed and shows the code Cloudflare reported', async () => {
    const turnstile = stubTurnstile();
    const fixture = await renderWidget();
    const cleared = vi.fn();
    fixture.componentInstance.cleared.subscribe(cleared);

    turnstile.lastOptions()['error-callback'](DOMAIN_ERROR_CODE);
    fixture.detectChanges();

    expect(text(fixture, '.turnstile-widget__message')).toContain('fehlgeschlagen');
    expect(text(fixture, '.turnstile-widget__code')).toBe(`Fehlercode ${DOMAIN_ERROR_CODE}`);
    // Without this the page would keep a token the widget no longer stands behind.
    expect(cleared).toHaveBeenCalled();
  });

  /**
   * The case that used to say nothing at all: no callback ever fires, because the widget never
   * gets far enough to have one.
   */
  it('explains a script that never arrives, and offers no code it does not have', async () => {
    const fixture = await renderWidget();
    const cleared = vi.fn();
    fixture.componentInstance.cleared.subscribe(cleared);

    await failInjectedScript(fixture);

    expect(text(fixture, '.turnstile-widget__message')).toContain('Werbeblocker');
    expect(fixture.nativeElement.querySelector('.turnstile-widget__code')).toBeNull();
    expect(cleared).toHaveBeenCalled();
  });

  it('keeps quiet while nothing is wrong', async () => {
    stubTurnstile();
    const fixture = await renderWidget();

    expect(fixture.nativeElement.querySelector('.turnstile-widget__problem')).toBeNull();
    // The live region itself is there from the start, or the message would go unannounced.
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  it('renders a fresh widget on retry and drops the notice', async () => {
    const turnstile = stubTurnstile();
    const fixture = await renderWidget();

    turnstile.lastOptions()['error-callback'](DOMAIN_ERROR_CODE);
    fixture.detectChanges();

    const retry: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.turnstile-widget__retry',
    );
    retry.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(turnstile.render).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.turnstile-widget__problem')).toBeNull();
  });

  it('emits the token itself, never an empty string standing in for a failure', async () => {
    const turnstile = stubTurnstile();
    const fixture = await renderWidget();
    const verified = vi.fn();
    fixture.componentInstance.verified.subscribe(verified);

    turnstile.lastOptions().callback('token-abc');

    expect(verified).toHaveBeenCalledWith('token-abc');
    expect(verified).toHaveBeenCalledTimes(1);
  });
});
