import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthLayout } from './auth-layout.component';

const INTRO = 'Ein Konto, damit Ihre Liste auch morgen noch da ist.';
const MESSAGE = 'Das hat gerade nicht geklappt.';

@Component({
  imports: [AuthLayout],
  template: `
    <famora-auth-layout heading="Registrierung" [intro]="intro" [error]="error()">
      <p class="host-page__content">Formular</p>
    </famora-auth-layout>
  `,
})
class HostPage {
  readonly intro = INTRO;
  readonly error = signal<string | undefined>(undefined);
}

async function renderLayout(): Promise<ComponentFixture<HostPage>> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });

  const fixture = TestBed.createComponent(HostPage);
  await fixture.whenStable();
  fixture.detectChanges();

  return fixture;
}

function query(fixture: ComponentFixture<HostPage>, selector: string): Element | null {
  return fixture.nativeElement.querySelector(selector);
}

describe('AuthLayout', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('shows the intro while nothing went wrong', async () => {
    const fixture = await renderLayout();

    expect(query(fixture, '.auth-layout__intro')?.textContent?.trim()).toBe(INTRO);
    expect(query(fixture, '.form-error')).toBeNull();
  });

  /**
   * The reserved height of the slot is what keeps the card from moving, and it only works while
   * exactly one of the two is in there. Rendering both would push the card down again.
   */
  it('puts the message in the place of the intro, never underneath it', async () => {
    const fixture = await renderLayout();
    fixture.componentInstance.error.set(MESSAGE);
    fixture.detectChanges();

    const notice = query(fixture, '.auth-layout__notice');
    const alert = query(fixture, '.form-error');

    expect(alert?.textContent?.trim()).toBe(MESSAGE);
    expect(query(fixture, '.auth-layout__intro')).toBeNull();
    expect(notice?.children).toHaveLength(1);
  });

  it('announces the message and takes focus, so a screen reader lands on it', async () => {
    const fixture = await renderLayout();
    fixture.componentInstance.error.set(MESSAGE);
    fixture.detectChanges();

    const alert = query(fixture, '.form-error');

    expect(alert?.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(alert);
  });
});
