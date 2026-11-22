import { TestBed } from '@angular/core/testing';
import { CoursePreviewSection } from './course-preview-section';
import { siteAssets } from '../../../../core/config/assets.config';

describe('Course banner modal', () => {
  const prototype = HTMLDialogElement.prototype;
  let showDescriptor: PropertyDescriptor | undefined;
  let closeDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    showDescriptor = Object.getOwnPropertyDescriptor(prototype, 'showModal');
    closeDescriptor = Object.getOwnPropertyDescriptor(prototype, 'close');
    // JSDOM has no native modal implementation. Exercise the Angular interactions
    // with reduced motion; this does not validate browser rendering or FLIP geometry.
    Object.defineProperty(prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '');
        // Model the native dialog's initial focus on its first control.
        this.querySelector<HTMLElement>('button')?.focus();
      },
    });
    Object.defineProperty(prototype, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open');
      },
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
  });

  afterEach(() => {
    if (showDescriptor) Object.defineProperty(prototype, 'showModal', showDescriptor);
    else Reflect.deleteProperty(prototype, 'showModal');
    if (closeDescriptor) Object.defineProperty(prototype, 'close', closeDescriptor);
    else Reflect.deleteProperty(prototype, 'close');
    vi.unstubAllGlobals();
  });

  it.each([
    [0, siteAssets.courses.beginner],
    [1, siteAssets.courses.modeling],
  ] as const)(
    'opens course %s with the current banner and closes through its close button',
    async (index, image) => {
      const fixture = TestBed.createComponent(CoursePreviewSection);
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('.course-product')).toBeNull();
      root.querySelectorAll<HTMLButtonElement>('.course-card')[index].click();
      await fixture.whenStable();
      const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
      expect(dialog.open).toBe(true);
      expect(dialog.querySelector('.course-modal-banner-image')?.getAttribute('src')).toBe(image);
      expect(dialog.querySelectorAll('.module-trigger')).toHaveLength(4);
      dialog.querySelector<HTMLButtonElement>('.course-modal-close')!.click();
      await fixture.whenStable();
      expect(root.querySelector('dialog')).toBeNull();
      expect(root.querySelectorAll('.course-card')).toHaveLength(2);
      expect(root.querySelector('.course-card img')?.getAttribute('style') ?? '').not.toContain(
        'hidden',
      );
    },
  );

  it('focuses the dialog without scrolling or marking the close button on opening', async () => {
    const fixture = TestBed.createComponent(CoursePreviewSection);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    try {
      root.querySelector<HTMLButtonElement>('.course-card')!.click();
      await fixture.whenStable();
      const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
      expect(document.activeElement).toBe(dialog);
      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
      expect(dialog.classList.contains('course-modal--keyboard')).toBe(false);
      expect(document.activeElement).not.toBe(dialog.querySelector('.course-modal-close'));
    } finally {
      focus.mockRestore();
    }
  });

  it('shows keyboard focus only after Tab and clears it on pointer input across child controls', async () => {
    const fixture = TestBed.createComponent(CoursePreviewSection);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.course-card')!.click();
    await fixture.whenStable();
    const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
    const close = dialog.querySelector<HTMLButtonElement>('.course-modal-close')!;
    const module = dialog.querySelector<HTMLButtonElement>('.module-trigger')!;
    for (const control of [close, module]) {
      control.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
      );
      expect(dialog.classList.contains('course-modal--keyboard')).toBe(true);
      control.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      expect(dialog.classList.contains('course-modal--keyboard')).toBe(false);
    }
    module.click();
    await fixture.whenStable();
    expect(module.getAttribute('aria-expanded')).toBe('true');
  });

  it.each(['cancel', 'click'])(
    'closes on native %s without leaving the course selected',
    async (type) => {
      const fixture = TestBed.createComponent(CoursePreviewSection);
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      root.querySelector<HTMLButtonElement>('.course-card')!.click();
      await fixture.whenStable();
      const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
      dialog.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
      await fixture.whenStable();
      expect(root.querySelector('dialog')).toBeNull();
      root.querySelector<HTMLButtonElement>('.course-card')!.click();
      await fixture.whenStable();
      expect(root.querySelector<HTMLDialogElement>('dialog')?.open).toBe(true);
    },
  );
});
