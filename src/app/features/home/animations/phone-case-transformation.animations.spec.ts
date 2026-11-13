import { TestBed } from '@angular/core/testing';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MockInstance } from 'vitest';
import { AnimationSessionService } from '../../../core/services/animation-session.service';
import { setupPhoneCaseTransformation } from './phone-case-transformation.animations';

describe('Phone case transformation lifecycle', () => {
  let session: AnimationSessionService;
  let root: HTMLElement;
  let section: HTMLElement;
  let digital: HTMLImageElement;
  let physical: HTMLImageElement;
  let triggerVars: ScrollTrigger.Vars;
  let controlledTrigger: {
    isActive: boolean;
    direction: number;
    scroll: () => number;
    kill: ReturnType<typeof vi.fn>;
  };
  let scrollPosition: number;
  let dispose: () => void;
  let reduced: boolean;
  let styles: HTMLStyleElement;
  let originalMatchMedia: PropertyDescriptor | undefined;
  let timelineSpy: MockInstance<typeof gsap.timeline>;

  beforeEach(() => {
    session = TestBed.inject(AnimationSessionService);
    reduced = false;
    dispose = () => {};
    originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn((query: string) => ({
        matches: query.includes('no-preference') ? !reduced : reduced,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    section = document.createElement('section');
    root = document.createElement('div');
    root.className = 'test-case-stage';
    root.innerHTML =
      '<img class="case-image--digital" alt=""><img class="case-image--physical" alt="">';
    section.append(root);
    document.body.append(section);
    digital = root.querySelector<HTMLImageElement>('.case-image--digital')!;
    physical = root.querySelector<HTMLImageElement>('.case-image--physical')!;
    for (const image of [digital, physical]) {
      Object.defineProperty(image, 'complete', { configurable: true, value: true });
      Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 1024 });
    }

    // Reproduce the component's CSS fallback, not a real rendered viewport.
    styles = document.createElement('style');
    styles.textContent =
      '.test-case-stage .case-image--digital { opacity: 0 } .test-case-stage .case-image--physical { opacity: 1 }';
    document.head.append(styles);
    scrollPosition = 100;
    controlledTrigger = {
      isActive: true,
      direction: 1,
      scroll: () => scrollPosition,
      kill: vi.fn(),
    };
    vi.spyOn(ScrollTrigger, 'create').mockImplementation((vars) => {
      triggerVars = vars;
      return controlledTrigger as unknown as ScrollTrigger;
    });
    vi.spyOn(gsap, 'registerPlugin').mockImplementation(() => {});
    timelineSpy = vi.spyOn(gsap, 'timeline');
  });

  afterEach(() => {
    dispose();
    gsap.ticker.sleep();
    section.remove();
    styles.remove();
    vi.restoreAllMocks();
    if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia);
    else Reflect.deleteProperty(window, 'matchMedia');
  });

  async function enter(direction = 1, isActive = true): Promise<void> {
    controlledTrigger.direction = direction;
    controlledTrigger.isActive = isActive;
    triggerVars.onEnter?.(controlledTrigger as unknown as ScrollTrigger);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  function timeline(): gsap.core.Timeline {
    return timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
  }

  it('starts only on an active downward entry and completes a real two-second GSAP timeline', async () => {
    dispose = setupPhoneCaseTransformation(root, section, session);
    expect(root.dataset['caseState']).toBe('digital');
    expect(timeline().paused()).toBe(true);
    expect(timeline().totalDuration()).toBe(2);

    await enter(-1);
    expect(session.caseTransformationStarted()).toBe(false);
    await enter(1, false);
    expect(session.caseTransformationStarted()).toBe(false);
    await enter();
    expect(session.caseTransformationStarted()).toBe(true);
    expect(root.dataset['caseState']).toBe('transforming');
    expect(controlledTrigger.kill).toHaveBeenCalled();

    timeline().pause().progress(1);
    expect(root.dataset['caseState']).toBe('physical');
    expect(getComputedStyle(digital).opacity).toBe('0');
    expect(getComputedStyle(physical).opacity).toBe('1');
    await enter();
    expect(root.dataset['caseState']).toBe('physical');
    expect(timeline().progress()).toBe(1);
  });

  it('does not replay after an interrupted route mount using the same session', async () => {
    dispose = setupPhoneCaseTransformation(root, section, session);
    await enter();
    timeline().pause().progress(0.35);
    dispose();
    const createdTimelines = timelineSpy.mock.calls.length;
    const createdTriggers = vi.mocked(ScrollTrigger.create).mock.calls.length;

    dispose = setupPhoneCaseTransformation(root, section, session);
    expect(timelineSpy.mock.calls.length).toBe(createdTimelines);
    expect(vi.mocked(ScrollTrigger.create).mock.calls.length).toBe(createdTriggers);
    expect(getComputedStyle(digital).opacity).toBe('0');
    expect(getComputedStyle(physical).opacity).toBe('1');
  });

  it('waits for downward scroll when the section is visible in the initial viewport', async () => {
    scrollPosition = 0;
    dispose = setupPhoneCaseTransformation(root, section, session);
    await enter();
    expect(session.caseTransformationStarted()).toBe(false);

    scrollPosition = 100;
    triggerVars.onUpdate?.(controlledTrigger as unknown as ScrollTrigger);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(session.caseTransformationStarted()).toBe(true);
    expect(root.dataset['caseState']).toBe('transforming');
  });

  it('shows the final CSS state and consumes the session under reduced motion', () => {
    reduced = true;
    dispose = setupPhoneCaseTransformation(root, section, session);
    expect(session.caseTransformationStarted()).toBe(true);
    expect(root.dataset['caseState']).toBe('physical');
    expect(ScrollTrigger.create).not.toHaveBeenCalled();
    expect(timelineSpy).not.toHaveBeenCalled();
    expect(getComputedStyle(digital).opacity).toBe('0');
    expect(getComputedStyle(physical).opacity).toBe('1');
  });

  it('cancels pending image readiness on destroy without consuming the transformation', async () => {
    for (const image of [digital, physical]) {
      Object.defineProperty(image, 'complete', { configurable: true, value: false });
    }
    dispose = setupPhoneCaseTransformation(root, section, session);
    triggerVars.onEnter?.(controlledTrigger as unknown as ScrollTrigger);
    dispose();
    digital.dispatchEvent(new Event('load'));
    physical.dispatchEvent(new Event('load'));
    await Promise.resolve();
    await Promise.resolve();

    expect(session.caseTransformationStarted()).toBe(false);
    expect(controlledTrigger.kill).toHaveBeenCalled();
    expect(timeline().isActive()).toBe(false);
    expect(getComputedStyle(digital).opacity).toBe('0');
    expect(getComputedStyle(physical).opacity).toBe('1');
  });

  it('waits for both images before beginning the two-second animation', async () => {
    Object.defineProperty(physical, 'complete', { configurable: true, value: false });
    dispose = setupPhoneCaseTransformation(root, section, session);
    await enter();
    expect(session.caseTransformationStarted()).toBe(false);
    expect(timeline().paused()).toBe(true);

    physical.dispatchEvent(new Event('load'));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(session.caseTransformationStarted()).toBe(true);
    expect(timeline().paused()).toBe(false);
  });

  it('keeps the physical image visible if the digital source fails without consuming the session', async () => {
    Object.defineProperty(digital, 'naturalWidth', { configurable: true, value: 0 });
    dispose = setupPhoneCaseTransformation(root, section, session);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(session.caseTransformationStarted()).toBe(false);
    expect(root.dataset['caseState']).toBe('physical');
    expect(getComputedStyle(physical).opacity).toBe('1');
    expect(controlledTrigger.kill).toHaveBeenCalled();
  });
});
