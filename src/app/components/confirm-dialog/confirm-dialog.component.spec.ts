import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog.component';

/**
 * jsdom ships <dialog> without showModal() and close(). Only those two calls are stubbed, down to
 * the part of the spec this component relies on — the synchronisation logic itself stays under
 * test.
 */
function stubDialogMethods(dialog: HTMLDialogElement): void {
  dialog.showModal = () => {
    dialog.open = true;
  };
  dialog.close = () => {
    dialog.open = false;
  };
}

interface RenderedDialog {
  fixture: ComponentFixture<ConfirmDialog>;
  dialog: HTMLDialogElement;
}

function renderDialog(): RenderedDialog {
  const fixture = TestBed.createComponent(ConfirmDialog);

  fixture.componentRef.setInput('open', false);
  fixture.componentRef.setInput('heading', 'Ordner löschen?');
  fixture.componentRef.setInput('description', 'Das lässt sich nicht rückgängig machen.');
  fixture.componentRef.setInput('confirmLabel', 'Löschen');
  fixture.detectChanges();

  const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
  stubDialogMethods(dialog);

  return { fixture, dialog };
}

function openDialog(rendered: RenderedDialog): void {
  rendered.fixture.componentRef.setInput('open', true);
  rendered.fixture.detectChanges();
}

describe('ConfirmDialog', () => {
  it('stays closed until the open input says otherwise', () => {
    expect(renderDialog().dialog.open).toBe(false);
  });

  it('opens and closes as the open input changes', () => {
    const rendered = renderDialog();

    openDialog(rendered);
    expect(rendered.dialog.open).toBe(true);

    rendered.fixture.componentRef.setInput('open', false);
    rendered.fixture.detectChanges();
    expect(rendered.dialog.open).toBe(false);
  });

  it('reports Esc as a cancel instead of closing behind the caller', () => {
    const rendered = renderDialog();
    openDialog(rendered);

    const cancelled = vi.fn();
    rendered.fixture.componentInstance.cancelled.subscribe(cancelled);
    rendered.dialog.dispatchEvent(new Event('cancel', { cancelable: true }));

    expect(cancelled).toHaveBeenCalled();
    // The caller lowers `open`; the element must not have closed itself.
    expect(rendered.dialog.open).toBe(true);
  });

  it('puts initial focus on cancel, not on the destructive action', () => {
    const rendered = renderDialog();
    openDialog(rendered);

    const buttons = rendered.fixture.nativeElement.querySelectorAll('button');
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('emits confirmed when the destructive action is pressed', () => {
    const rendered = renderDialog();
    openDialog(rendered);

    const confirmed = vi.fn();
    rendered.fixture.componentInstance.confirmed.subscribe(confirmed);
    (rendered.fixture.nativeElement.querySelectorAll('button')[0] as HTMLButtonElement).click();

    expect(confirmed).toHaveBeenCalled();
  });
});
