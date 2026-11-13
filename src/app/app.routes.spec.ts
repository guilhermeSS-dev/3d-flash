import { TestBed } from '@angular/core/testing';
import { ViewportScroller } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { siteConfig } from './core/config/site.config';
import { EnrollmentButton } from './features/course/components/enrollment-button/enrollment-button';

describe('Application routing', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('loads the standalone home page at the root URL', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Transforme sua',
    );
    expect(TestBed.inject(Title).getTitle()).toBe('3D Flash — Impressão 3D');
  });

  it('supports direct access to /curso and navigation back through RouterLink', async () => {
    const harness = await RouterTestingHarness.create('/curso');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(
      siteConfig.course.name || 'Curso 3D Flash',
    );
    expect(TestBed.inject(Title).getTitle()).toBe('Curso | 3D Flash');

    harness.routeNativeElement?.querySelector<HTMLAnchorElement>('.back-link')?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Transforme sua',
    );
  });

  it('recovers an unknown URL by returning to the home page', async () => {
    const harness = await RouterTestingHarness.create('/pagina-inexistente');
    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Transforme sua',
    );
  });

  it('navigates to the course through both landing calls to action', async () => {
    const harness = await RouterTestingHarness.create('/');
    const router = TestBed.inject(Router);

    for (let index = 0; index < 2; index++) {
      await harness.navigateByUrl('/');
      const links =
        harness.routeNativeElement?.querySelectorAll<HTMLAnchorElement>('a[href="/curso"]');
      expect(links?.length).toBe(2);
      links?.[index]?.click();
      await harness.fixture.whenStable();
      expect(router.url).toBe('/curso');
    }
  });

  it('keeps unconfigured social destinations and blocked images unavailable', async () => {
    const harness = await RouterTestingHarness.create('/');
    const page = harness.routeNativeElement;
    const contact = page?.querySelector('#contato');
    const buttons = contact?.querySelectorAll<HTMLButtonElement>('button');

    expect(buttons?.length).toBe(2);
    expect(Array.from(buttons ?? []).every((button) => button.disabled)).toBe(true);
    expect(contact?.querySelector('a')).toBeNull();
    expect(page?.querySelector('[data-person-slot] img')).toBeNull();
    expect(page?.querySelector('[data-keychain="e4kc-motorsport"] img')).toBeNull();
  });

  it('shares one enrollment destination and keeps the floating menu off the course page', async () => {
    const harness = await RouterTestingHarness.create('/curso');
    const enrollmentButtons = harness.routeDebugElement?.queryAll(By.directive(EnrollmentButton));
    expect(enrollmentButtons?.length).toBe(2);
    for (const element of enrollmentButtons ?? []) {
      const button = element.componentInstance as EnrollmentButton;
      expect(button.destination()).toBe(siteConfig.links.hotmart);
    }
    expect(harness.routeNativeElement?.querySelectorAll('app-course-accordion button').length).toBe(
      4,
    );
    expect(harness.routeNativeElement?.querySelector('.menu-visual, app-floating-menu')).toBeNull();
  });

  it('resolves each menu anchor to a focusable section and supports selecting it again', async () => {
    const harness = await RouterTestingHarness.create('/');
    const page = harness.routeNativeElement!;
    const router = TestBed.inject(Router);
    const scroller = TestBed.inject(ViewportScroller);
    const trigger = page.querySelector<HTMLButtonElement>('app-floating-menu button')!;
    const links = page.querySelectorAll<HTMLAnchorElement>('app-floating-menu nav a');
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    try {
      expect(links.length).toBe(5);
      for (const link of links) {
        trigger.click();
        await harness.fixture.whenStable();
        const fragment = router.parseUrl(link.getAttribute('href')!).fragment!;
        const target = page.querySelector<HTMLElement>('#' + fragment)!;
        expect(target.getAttribute('tabindex')).toBe('-1');

        link.click();
        await harness.fixture.whenStable();
        expect(router.parseUrl(router.url).fragment).toBe(fragment);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');

        // Exercise public focus handling. JSDOM does not provide real scroll geometry.
        scroller.scrollToAnchor(fragment);
        expect(document.activeElement).toBe(target);

        trigger.click();
        await harness.fixture.whenStable();
        link.click();
        await harness.fixture.whenStable();
        expect(router.parseUrl(router.url).fragment).toBe(fragment);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
      }
    } finally {
      scroll.mockRestore();
    }
  });
});
