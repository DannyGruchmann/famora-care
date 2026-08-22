import { TestBed } from '@angular/core/testing';
import { Button } from './button.component';

function renderButton(variant?: string) {
  const fixture = TestBed.createComponent(Button);
  if (variant !== undefined) fixture.componentRef.setInput('variant', variant);
  fixture.detectChanges();

  return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
}

describe('Button', () => {
  it('keeps the base class next to the variant modifier', () => {
    const button = renderButton('danger');

    expect(button.classList.contains('button')).toBe(true);
    expect(button.classList.contains('button--danger')).toBe(true);
  });

  it('defaults to the primary variant', () => {
    expect(renderButton().classList.contains('button--primary')).toBe(true);
  });

  it('is a plain button unless asked to submit', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.type).toBe('button');

    fixture.componentRef.setInput('type', 'submit');
    fixture.detectChanges();
    expect(button.type).toBe('submit');
  });

  it('swallows clicks while disabled, so the host never sees one', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const seen = vi.fn();
    fixture.nativeElement.addEventListener('click', seen);
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(seen).not.toHaveBeenCalled();
  });
});
