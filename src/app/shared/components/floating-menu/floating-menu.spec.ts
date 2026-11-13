import { ViewportScroller } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FloatingMenu } from './floating-menu';

@Component({ template: '' })
class EmptyPage {}

describe('FloatingMenu', () => {
  let fixture: ComponentFixture<FloatingMenu>;
  let element: HTMLElement;
  let trigger: HTMLButtonElement;
  let panel: HTMLElement;
  let scroller: { setOffset: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    scroller = { setOffset: vi.fn() };
    TestBed.configureTestingModule({
      imports: [FloatingMenu],
      providers: [
        provideRouter([{ path: '', component: EmptyPage }]),
        { provide: ViewportScroller, useValue: scroller },
      ],
    });
    fixture = TestBed.createComponent(FloatingMenu);
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
    trigger = element.querySelector<HTMLButtonElement>('button')!;
    panel = element.querySelector<HTMLElement>('nav')!;
  });

  async function open(): Promise<void> {
    trigger.click();
    await fixture.whenStable();
  }

  it('starts collapsed with its navigation unavailable to focus', () => {
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-hidden')).toBe('true');
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(Array.from(panel.querySelectorAll('a')).every((link) => link.tabIndex === -1)).toBe(
      true,
    );
  });

  it('opens and closes through the same native button', async () => {
    await open();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hasAttribute('inert')).toBe(false);
    expect(Array.from(panel.querySelectorAll('a')).every((link) => link.tabIndex === 0)).toBe(true);

    trigger.click();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('ignores inside pointer events and closes when clicking outside', async () => {
    await open();
    panel.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, composed: true }));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, composed: true }));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes with Escape and restores focus to the trigger', async () => {
    await open();
    panel.querySelector<HTMLAnchorElement>('a')?.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes when keyboard focus leaves the disclosure', async () => {
    await open();
    element.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }),
    );
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('navigates to the selected section and closes', async () => {
    await open();
    panel.querySelector<HTMLAnchorElement>('a[href="/#sobre"]')?.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/#sobre');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('uses the current button geometry for anchor clearance and resets it on destroy', () => {
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({ bottom: 68 } as DOMRect);
    const offset = scroller.setOffset.mock.calls[0]?.[0] as () => [number, number];
    expect(offset()).toEqual([0, 84]);
    fixture.destroy();
    expect(scroller.setOffset).toHaveBeenLastCalledWith([0, 0]);
  });
});
