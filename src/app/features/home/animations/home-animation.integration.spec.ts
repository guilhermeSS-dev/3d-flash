import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { siteAssets } from '../../../core/config/assets.config';
import {
  buildKeychainRoute,
  sampleKeychainRoute,
  type KeychainRouteInput,
} from './keychain-route.geometry';
import { type KeychainRouteController, type KeychainRouteSnapshot } from './keychain-route-layout';
import { setupKeychainFloat } from './keychain-float.animations';
import { setupKeychainScroll } from './keychain-scroll.animations';
import { setupElectricTrail } from './electric-trail.animations';

/** Coherent numeric layout; this integration does not represent a browser-rendered viewport. */
function layout(width: number): KeychainRouteSnapshot {
  const footprint = { width: 24, height: 64 };
  const input: KeychainRouteInput = {
    width,
    footprint,
    clearance: 8,
    corridor: 40,
    origin: { x: 90, y: 100 },
    heroScene: { left: 40, top: 0, width: width - 80, height: 300 },
    sections: {
      hero: { left: 0, top: 0, width, height: 600 },
      about: { left: 0, top: 600, width, height: 400 },
      course: { left: 0, top: 1000, width, height: 600 },
      contact: { left: 0, top: 1600, width, height: 400 },
    },
    formation: { left: 40, top: 1800, width: width - 80, height: 120 },
    obstacles: [
      {
        id: 'hero-copy',
        section: 'hero',
        rect: { left: 40, top: 340, width: width - 80, height: 200 },
      },
      {
        id: 'about-copy',
        section: 'about',
        rect: { left: 40, top: 680, width: width - 80, height: 200 },
      },
      {
        id: 'course-copy',
        section: 'course',
        rect: { left: 40, top: 1100, width: width - 80, height: 300 },
      },
      {
        id: 'social',
        section: 'contact',
        rect: { left: 40, top: 1680, width: width - 80, height: 80 },
      },
    ],
  };
  const route = buildKeychainRoute(input);
  expect(route.issues).toEqual([]);
  const members = siteAssets.keychains
    .filter((asset) => asset.renderAllowed)
    .map((asset, index) => ({
      id: asset.id,
      rect: {
        left: 75 + index * 35,
        top: 70,
        width: 30,
        height: (30 * asset.bounds.height) / asset.bounds.width,
      },
    }));
  return {
    route,
    progress: 0,
    position: input.origin,
    geometry: {
      surface: { width, height: 2100 },
      obstacles: input.obstacles.map((item) => item.rect),
      footprint,
      leader: members[0].rect,
      members,
      formation: input.formation,
      documentTop: 0,
    },
  };
}

describe('Home animation pipeline integration', () => {
  let root: HTMLElement;
  let origin: HTMLElement;
  let svg: SVGSVGElement;
  let snapshot: KeychainRouteSnapshot;
  let time: number;
  let reduced: boolean;
  let visibility: DocumentVisibilityState;
  let timeline: gsap.core.Timeline;
  let scroll: ReturnType<typeof setupKeychainScroll>;
  let trail: ReturnType<typeof setupElectricTrail>;
  let stopFloat: () => void;
  let originalMedia: PropertyDescriptor | undefined;
  let originalVisibility: PropertyDescriptor | undefined;
  let fades: gsap.core.Tween[];
  let triggers: { kill: ReturnType<typeof vi.fn>; getTween: ReturnType<typeof vi.fn> }[];

  beforeEach(() => {
    time = 0;
    reduced = false;
    visibility = 'visible';
    fades = [];
    triggers = [];
    originalMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: query.includes('no-preference')
          ? !reduced
          : query.includes('reduced-motion: reduce')
            ? reduced
            : false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
    vi.spyOn(window.performance, 'now').mockImplementation(() => time);
    vi.spyOn(gsap, 'registerPlugin').mockImplementation(() => {});
    vi.spyOn(ScrollTrigger, 'create').mockImplementation((vars) => {
      timeline = vars.animation as gsap.core.Timeline;
      const trigger = {
        progress: 0,
        kill: vi.fn(),
        getTween: vi.fn(() => ({ pause: vi.fn(), kill: vi.fn() })),
      };
      triggers.push(trigger);
      return trigger as unknown as ScrollTrigger;
    });
    const fromTo = gsap.fromTo.bind(gsap);
    vi.spyOn(gsap, 'fromTo').mockImplementation((...args) => {
      const tween = fromTo(...args);
      if (args[0] && typeof args[0] === 'object' && 'value' in args[0]) fades.push(tween);
      return tween;
    });
    root = document.createElement('div');
    origin = document.createElement('div');
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    snapshot = layout(390);
    origin.innerHTML = snapshot
      .geometry!.members.map(
        (member) =>
          `<div data-keychain="${member.id}" style="rotate:10deg"><div data-keychain-float><img alt=""></div></div>`,
      )
      .join('');
    root.append(svg, origin);
    document.body.append(root);
    stopFloat = () => {};
    scroll = { refresh: () => {}, destroy: () => {} };
    trail = { refresh: () => {}, update: () => {}, destroy: () => {} };
  });
  afterEach(() => {
    scroll.destroy();
    trail.destroy();
    stopFloat();
    gsap.ticker.sleep();
    root.remove();
    vi.restoreAllMocks();
    if (originalMedia) Object.defineProperty(window, 'matchMedia', originalMedia);
    else Reflect.deleteProperty(window, 'matchMedia');
    if (originalVisibility) Object.defineProperty(document, 'visibilityState', originalVisibility);
    else Reflect.deleteProperty(document, 'visibilityState');
  });
  const mount = () => {
    const controller: KeychainRouteController = {
      getSnapshot: () => snapshot,
      setProgress: (progress) => {
        snapshot = {
          ...snapshot,
          progress,
          position: sampleKeychainRoute(snapshot.route!, progress),
        };
      },
      refresh: () => {},
      destroy: () => {},
    };
    stopFloat = setupKeychainFloat(origin, root);
    trail = setupElectricTrail(svg, root);
    trail.refresh(snapshot.geometry);
    scroll = setupKeychainScroll(origin, root, controller, {
      onFrame: (frame) => trail.update(frame),
    });
  };
  const advance = (progress: number, native = true) => {
    time += 60;
    if (native) window.dispatchEvent(new Event('scroll'));
    timeline.progress(progress);
  };
  const active = () =>
    Array.from(svg.querySelectorAll('[data-electric-slot]')).filter(
      (slot) => Number(slot.getAttribute('opacity')) > 0,
    );

  it('combines reversible travel and electric emissions with independently continuing float', () => {
    mount();
    advance(0.4);
    expect(active().length).toBeGreaterThan(0);
    const inner = origin.querySelector<HTMLElement>('[data-keychain-float]')!;
    const floating = gsap.getTweensOf(inner)[0];
    expect(floating.repeat()).toBe(-1);
    const pose = inner.parentElement!.style.transform;
    const rays = Array.from(svg.querySelectorAll('path')).map((path) => path.getAttribute('d'));
    floating.pause().progress(0.7);
    expect(inner.parentElement!.style.transform).toBe(pose);
    expect(Array.from(svg.querySelectorAll('path')).map((path) => path.getAttribute('d'))).toEqual(
      rays,
    );
    advance(1);
    const formation = Array.from(origin.querySelectorAll<HTMLElement>('[data-keychain]')).map(
      (node) => node.style.transform,
    );
    expect(active().length).toBeLessThanOrEqual(8);
    window.dispatchEvent(new Event('scrollend'));
    time += 200;
    fades.forEach((fade) => fade.progress(1));
    expect(active()).toHaveLength(0);
    const floatPose = inner.style.transform;
    floating.progress(0.2);
    expect(inner.style.transform).not.toBe(floatPose);
    expect(
      Array.from(origin.querySelectorAll<HTMLElement>('[data-keychain]')).map(
        (node) => node.style.transform,
      ),
    ).toEqual(formation);
    advance(0.6);
    expect(active().length).toBeGreaterThan(0);
    advance(1);
    expect(
      Array.from(origin.querySelectorAll<HTMLElement>('[data-keychain]')).map(
        (node) => node.style.transform,
      ),
    ).toEqual(formation);
  });

  it('retains travel progress and refreshes masks without emitting a resize streak', () => {
    mount();
    advance(0.73);
    const held = snapshot.progress;
    snapshot = { ...layout(820), progress: held };
    trail.refresh(snapshot.geometry);
    scroll.refresh();
    expect(snapshot.progress).toBeCloseTo(held, 6);
    expect(active()).toHaveLength(0);
    expect(svg.getAttribute('viewBox')).toBe('0 0 820 2100');
    advance(0.8);
    expect(active().length).toBeGreaterThan(0);
  });

  it('keeps the complete pipeline static under reduced motion', () => {
    reduced = true;
    mount();
    expect(ScrollTrigger.create).not.toHaveBeenCalled();
    expect(svg.children).toHaveLength(0);
    for (const inner of origin.querySelectorAll('[data-keychain-float]'))
      expect(gsap.getTweensOf(inner)).toHaveLength(0);
    expect(snapshot.progress).toBe(0);
  });

  it('pauses float and clears electrical effects together when the document is hidden', () => {
    mount();
    advance(0.4);
    expect(active().length).toBeGreaterThan(0);
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(active()).toHaveLength(0);
    const inner = origin.querySelector<HTMLElement>('[data-keychain-float]')!;
    expect(gsap.getTweensOf(inner)[0].paused()).toBe(true);
    advance(0.5);
    expect(active()).toHaveLength(0);
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(gsap.getTweensOf(inner)[0].paused()).toBe(false);
  });

  it('disposes the whole pipeline without retaining its SVG, tweens or triggers', () => {
    mount();
    advance(0.5);
    const moving = timeline;
    const floats = Array.from(origin.querySelectorAll('[data-keychain-float]')).flatMap((inner) =>
      gsap.getTweensOf(inner),
    );
    scroll.destroy();
    trail.destroy();
    stopFloat();
    expect(svg.children).toHaveLength(0);
    expect(triggers.every((trigger) => trigger.kill.mock.calls.length > 0)).toBe(true);
    const remaining = new Set(gsap.globalTimeline.getChildren(true, true, true));
    expect([...fades, ...floats, moving].some((tween) => remaining.has(tween))).toBe(false);
    for (const inner of origin.querySelectorAll<HTMLElement>('[data-keychain-float]'))
      expect(inner.style.transform).toBe('');
    moving.progress(0.9);
    expect(svg.children).toHaveLength(0);
  });
});
