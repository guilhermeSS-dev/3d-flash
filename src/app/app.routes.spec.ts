import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ViewportScroller } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { siteConfig } from './core/config/site.config';
import { EnrollmentButton } from './features/course/components/enrollment-button/enrollment-button';
import { launchConfig } from './core/config/launch.config';
import { LAUNCH_CONFIG } from './features/launch/launch-session.service';

describe('Application routing', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: LAUNCH_CONFIG, useValue: { ...launchConfig, enabled: false } },
      ],
    });
  });

  it('loads the standalone home page at the root URL', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Transforme sua',
    );
    expect(TestBed.inject(Title).getTitle()).toBe('3D Flash — Impressão 3D');
  });

  it('redirects /curso to the beginner course and navigates back through RouterLink', async () => {
    const harness = await RouterTestingHarness.create('/curso');
    expect(TestBed.inject(Router).url).toBe('/curso/iniciante');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Impressão 3D para iniciantes',
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

  it('uses the Hero call to action as an anchor to the course section', async () => {
    const harness = await RouterTestingHarness.create('/');
    const router = TestBed.inject(Router);

    const links = harness.routeNativeElement?.querySelectorAll<HTMLAnchorElement>(
      '.hero-copy a[href="/#curso"]',
    );
    expect(links?.length).toBe(1);
    links?.[0]?.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/#curso');
  });

  it('loads the selected course JSON when navigating between course cards', async () => {
    const harness = await RouterTestingHarness.create('/curso/iniciante');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Impressão 3D para iniciantes',
    );
    expect(harness.routeNativeElement?.querySelectorAll('.module-trigger')).toHaveLength(4);

    await harness.navigateByUrl('/curso/modelagem');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Modelagem 3D para impressão',
    );
    const titles = Array.from(
      harness.routeNativeElement?.querySelectorAll('.module-trigger span:first-child') ?? [],
    ).map((node) => node.textContent);
    expect(titles[0]).toContain('Fundamentos da modelagem 3D');
  });

  it('uses the supplied Hero image and keeps the mismatched keychain unavailable', async () => {
    const harness = await RouterTestingHarness.create('/');
    const page = harness.routeNativeElement;
    const heroImage = page?.querySelector<HTMLImageElement>('[data-person-slot] img');

    expect(heroImage?.getAttribute('src')).toBe('assets/images/pessoa-hero-transparente.png');
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
      expect(links.length).toBe(4);
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
