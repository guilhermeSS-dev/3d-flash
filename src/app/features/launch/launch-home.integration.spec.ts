import { LaunchClock } from './launch-clock';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { routes } from '../../app.routes';
import { launchConfig } from '../../core/config/launch.config';
import { AnimationSessionService } from '../../core/services/animation-session.service';
import { LAUNCH_CONFIG, LaunchSessionService } from './launch-session.service';

// Legacy UI scenarios use a deterministic clock; trusted-clock behavior is tested separately.
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: LaunchClock,
        useValue: {
          now: () => Date.now(),
          target: null,
          sync: async () => true,
          cancel: () => {},
        },
      },
    ],
  });
});
describe('Waiting layer and existing home integration', () => {
  let wall: number;
  beforeEach(() => {
    wall = Date.parse('2030-12-01T22:59:00Z');
    vi.spyOn(Date, 'now').mockImplementation(() => wall);
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(gsap, 'registerPlugin').mockImplementation(() => {});
    vi.spyOn(ScrollTrigger, 'refresh').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: LAUNCH_CONFIG,
          useValue: { ...launchConfig, enabled: true, countdownRefreshMs: 10 },
        },
      ],
    });
  });
  afterEach(() => {
    gsap.ticker.sleep();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('keeps the current landing, products and course links mounted and inert', async () => {
    const harness = await RouterTestingHarness.create('/');
    const root = harness.routeNativeElement!;
    expect(root.querySelectorAll('section[id]')).toHaveLength(5);
    expect(root.querySelector('.home-page')).not.toBeNull();
    expect(root.querySelector('app-products-section')).not.toBeNull();
    expect(root.querySelectorAll('.course-card')).toHaveLength(2);
    expect(root.querySelector('[aria-modal="true"]')).not.toBeNull();
    expect(root.querySelector('.home-page')?.parentElement?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(TestBed.inject(AnimationSessionService).caseTransformationStarted()).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');
  });
  it('cancels deferred animation initialization and unlocks body scroll when navigating away', async () => {
    const harness = await RouterTestingHarness.create('/');
    await harness.navigateByUrl('/curso');
    expect(harness.routeNativeElement?.querySelector('[aria-modal]')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
    TestBed.inject(LaunchSessionService).reveal();
    expect(TestBed.inject(AnimationSessionService).caseTransformationStarted()).toBe(false);
  });
  it('reveals the same home DOM at launch and only then initializes its animations', async () => {
    const harness = await RouterTestingHarness.create('/');
    const home = harness.routeNativeElement!.querySelector('.home-page');
    const entrance = vi.spyOn(TestBed.inject(AnimationSessionService), 'claimEntrance');
    expect(entrance).not.toHaveBeenCalled();
    wall = Date.parse(launchConfig.launchAt);
    await new Promise((resolve) => setTimeout(resolve, 30));
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.querySelector('.home-page')).toBe(home);
    expect(harness.routeNativeElement!.querySelector('[aria-modal]')).toBeNull();
    expect(entrance).toHaveBeenCalledWith('opening');
    expect(home?.parentElement?.getAttribute('aria-hidden')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
