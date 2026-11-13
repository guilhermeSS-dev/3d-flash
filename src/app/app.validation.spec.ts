import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

/** DOM-level accessibility checks; not a screen-reader, contrast or rendered-layout audit. */
describe('Application acceptance structure', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes)] }));

  it.each(['/', '/curso'])(
    'keeps IDs, accessible references and control names consistent on %s',
    async (url) => {
      const harness = await RouterTestingHarness.create(url);
      const page = harness.routeNativeElement!;
      expect(page.querySelectorAll('h1')).toHaveLength(1);
      const ids = Array.from(page.querySelectorAll('[id]')).map((node) => node.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const node of page.querySelectorAll(
        '[aria-labelledby], [aria-controls], [aria-describedby]',
      )) {
        for (const attribute of ['aria-labelledby', 'aria-controls', 'aria-describedby']) {
          for (const id of (node.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)) {
            expect(ids, `${attribute} must resolve: ${id}`).toContain(id);
          }
        }
      }
      for (const control of page.querySelectorAll('button,a[href]')) {
        expect((control.getAttribute('aria-label') || control.textContent || '').trim()).not.toBe(
          '',
        );
      }
      for (const image of page.querySelectorAll('img')) {
        expect(image.hasAttribute('alt')).toBe(true);
        expect(Number(image.getAttribute('width'))).toBeGreaterThan(0);
        expect(Number(image.getAttribute('height'))).toBeGreaterThan(0);
      }
      for (const anchor of page.querySelectorAll('a[target="_blank"]')) {
        expect(anchor.getAttribute('rel')).toContain('noopener');
        expect(anchor.getAttribute('rel')).toContain('noreferrer');
      }
    },
  );

  it('preserves exactly four home sections and the footer with non-interactive decorations', async () => {
    const harness = await RouterTestingHarness.create('/');
    const page = harness.routeNativeElement!;
    expect(Array.from(page.querySelectorAll('section[id]')).map((node) => node.id)).toEqual([
      'inicio',
      'sobre',
      'curso',
      'contato',
    ]);
    expect(page.querySelectorAll('footer#rodape')).toHaveLength(1);
    expect(page.querySelector('form')).toBeNull();
    const decorative = page.querySelector('app-floating-keychains')!;
    expect(decorative.getAttribute('aria-hidden')).toBe('true');
    expect(decorative.querySelectorAll('a,button,input,[tabindex]')).toHaveLength(0);
    const overlay = page.querySelector('app-electric-trail')!;
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(overlay.querySelector('svg')!.getAttribute('focusable')).toBe('false');
  });

  it('repeated route navigation never duplicates menus, electric overlays or page headings', async () => {
    const harness = await RouterTestingHarness.create('/');
    for (let cycle = 0; cycle < 3; cycle++) {
      await harness.navigateByUrl('/curso');
      let page = harness.routeNativeElement!;
      expect(page.querySelectorAll('h1')).toHaveLength(1);
      expect(
        page.querySelector('app-floating-menu,app-floating-keychains,app-electric-trail'),
      ).toBeNull();
      page.querySelector<HTMLAnchorElement>('.back-link')!.click();
      await harness.fixture.whenStable();
      expect(TestBed.inject(Router).url).toBe('/');
      page = harness.routeNativeElement!;
      expect(page.querySelectorAll('app-floating-menu')).toHaveLength(1);
      expect(page.querySelectorAll('app-electric-trail')).toHaveLength(1);
      expect(page.querySelectorAll('app-floating-keychains img')).toHaveLength(5);
      expect(page.querySelectorAll('h1')).toHaveLength(1);
    }
  });

  it('connects all four course disclosure states to their own labelled panels', async () => {
    const harness = await RouterTestingHarness.create('/curso');
    const page = harness.routeNativeElement!;
    const buttons = page.querySelectorAll<HTMLButtonElement>('.module-trigger');
    expect(buttons).toHaveLength(4);
    for (const button of buttons) {
      const panel = page.querySelector<HTMLElement>('#' + button.getAttribute('aria-controls'))!;
      expect(button.type).toBe('button');
      expect(panel.getAttribute('aria-labelledby')).toBe(button.id);
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(panel.hasAttribute('inert')).toBe(true);
      button.click();
      await harness.fixture.whenStable();
      expect(button.getAttribute('aria-expanded')).toBe('true');
      expect(panel.getAttribute('aria-hidden')).toBe('false');
      expect(panel.hasAttribute('inert')).toBe(false);
      button.click();
      await harness.fixture.whenStable();
      expect(panel.hasAttribute('inert')).toBe(true);
    }
  });
});
