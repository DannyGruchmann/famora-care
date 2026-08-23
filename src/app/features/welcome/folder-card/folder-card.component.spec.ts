import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { DeadlineTask } from '@/app/features/dashboard/dashboard.types';
import { MODE_AFTER_DEATH, MODE_PREPARE } from '@/app/features/onboarding/onboarding.questions';
import { FolderCard } from './folder-card.component';
import type { FolderSummary } from '../welcome.summary';

function summaryWith(overrides: Partial<FolderSummary> = {}): FolderSummary {
  return {
    id: 'folder-1',
    label: 'Meine Vorsorge',
    mode: MODE_PREPARE,
    doneCount: 2,
    totalCount: 8,
    completionRate: 25,
    nextDeadline: null,
    ...overrides,
  };
}

function deadlineWith(daysLeft: number): DeadlineTask {
  return {
    id: 'd-registry',
    title: 'Sterbefall beim Standesamt anzeigen',
    detail: '',
    urgency: 'now',
    done: false,
    daysLeft,
    assignedTo: null,
    isAutomatic: false,
  };
}

function renderCard(folder: FolderSummary): ComponentFixture<FolderCard> {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });

  const fixture = TestBed.createComponent(FolderCard);
  fixture.componentRef.setInput('folder', folder);
  fixture.detectChanges();

  return fixture;
}

function textOf(fixture: ComponentFixture<FolderCard>, selector: string): string {
  return (fixture.nativeElement.querySelector(selector)?.textContent ?? '').trim();
}

describe('FolderCard', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('gives the precaution folder its own colour', () => {
    const fixture = renderCard(summaryWith());
    const card = fixture.nativeElement.querySelector('.folder-card');

    expect(card.classList.contains('folder-card--prepare')).toBe(true);
  });

  it('leaves the after-death folder in the brand colour', () => {
    const fixture = renderCard(summaryWith({ mode: MODE_AFTER_DEATH, label: 'Ihr Ordner' }));
    const card = fixture.nativeElement.querySelector('.folder-card');

    expect(card.classList.contains('folder-card--prepare')).toBe(false);
  });

  it('names the path and how far it has come', () => {
    const fixture = renderCard(summaryWith());

    expect(textOf(fixture, '.folder-card__meta')).toBe('Vorsorge · 2 von 8 erledigt');
  });

  it('shows a deadline only when there is one', () => {
    expect(renderCard(summaryWith()).nativeElement.querySelector('.folder-card__deadline')).toBe(
      null,
    );
  });

  it('spells out an overdue deadline rather than a bare number', () => {
    const fixture = renderCard(summaryWith({ nextDeadline: deadlineWith(-2) }));

    expect(textOf(fixture, '.folder-card__deadline-text')).toContain('2 Tage überfällig');
  });
});
