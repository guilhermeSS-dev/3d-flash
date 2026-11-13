import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animationConfig } from '../../../core/config/animation.config';
import {
  buildKeychainRoute,
  sampleKeychainRoute,
  type KeychainRouteInput,
  type RouteRect,
} from './keychain-route.geometry';
import { type KeychainRouteController, type KeychainRouteSnapshot } from './keychain-route-layout';
import { setupKeychainScroll, type KeychainScrollController } from './keychain-scroll.animations';

interface HeroFixture {
  readonly input: KeychainRouteInput;
  readonly leader: RouteRect;
  readonly copy: RouteRect;
}

/** Source CSS at a 16px root font, plus the visible original Rô Modas image ratio. */
function fixture(width: number): HeroFixture {
  const config = animationConfig.keychains;
  const gutter = Math.max(20, Math.min(width * 0.04, 64));
  const contentWidth = Math.min(width, 1280) - gutter * 2;
  const contentLeft = (width - Math.min(width, 1280)) / 2 + gutter;
  const mobile = width < 768;
  const heroScene = mobile
    ? {
        left: contentLeft,
        top: 0,
        width: contentWidth,
        height: Math.max(240, contentWidth / 1.13),
      }
    : {
        left: contentLeft + contentWidth * 0.43,
        top: 0,
        width: contentWidth * 0.57,
        height: width < 1024 ? 496 : Math.max(528, Math.min(width * 0.52, 752)),
      };
  const leaderWidth = heroScene.width * 0.12;
  const leader = {
    left: heroScene.left + heroScene.width * (mobile ? 0.05 : 0.04),
    top: heroScene.height * (mobile ? 0.22 : 0.12),
    width: leaderWidth,
    height: (leaderWidth * 992) / 527,
  };
  const footprint = {
    width: Math.max(
      config.routeWidthMinPx,
      Math.min(width * config.routeWidthRatio, config.routeWidthMaxPx),
    ),
    height: 0,
  };
  footprint.height = footprint.width * config.routeHeightRatio + config.floatDistancePx * 2;
  const clearance = config.routeClearancePx;
  const corridor = Math.ceil(footprint.width + clearance * 2);
  const heroHeight = heroScene.height + (mobile ? 260 : 0);
  const sections = {
    hero: { left: 0, top: 0, width, height: heroHeight },
    about: { left: 0, top: heroHeight, width, height: 500 },
    course: { left: 0, top: heroHeight + 500, width, height: 600 },
    contact: { left: 0, top: heroHeight + 1100, width, height: 420 },
  };
  const content = (top: number, height: number): RouteRect => ({
    left: corridor,
    top,
    width: width - corridor * 2,
    height,
  });
  const copy = mobile
    ? content(heroScene.height, 200)
    : { left: contentLeft, top: 100, width: contentWidth * 0.43, height: 300 };
  return {
    leader,
    copy,
    input: {
      width,
      heroScene,
      sections,
      footprint,
      clearance,
      corridor,
      origin: { x: leader.left + leader.width / 2, y: leader.top + leader.height / 2 },
      formation: content(sections.contact.top + 220, footprint.height + 40),
      obstacles: [
        { id: 'hero-copy', section: 'hero', rect: copy },
        { id: 'about-copy', section: 'about', rect: content(sections.about.top + 100, 200) },
        { id: 'course-copy', section: 'course', rect: content(sections.course.top + 100, 280) },
        { id: 'contact-copy', section: 'contact', rect: content(sections.contact.top + 70, 70) },
      ],
    },
  };
}

function visibleBounds(
  leader: RouteRect,
  origin: { x: number; y: number },
  motion: readonly number[],
  floatY: number,
  floatAngle: number,
): RouteRect {
  const [dx, dy, angle, scale] = motion;
  const outer = (angle * Math.PI) / 180;
  const combined = ((angle + floatAngle) * Math.PI) / 180;
  // Translation on the inner floating wrapper is rotated/scaled by its outer wrapper.
  const center = {
    x: origin.x + dx - Math.sin(outer) * scale * floatY,
    y: origin.y + dy + Math.cos(outer) * scale * floatY,
  };
  const corners = [-1, 1].flatMap((x) =>
    [-1, 1].map((y) => ({
      x:
        center.x +
        (scale * (Math.cos(combined) * x * leader.width - Math.sin(combined) * y * leader.height)) /
          2,
      y:
        center.y +
        (scale * (Math.sin(combined) * x * leader.width + Math.cos(combined) * y * leader.height)) /
          2,
    })),
  );
  const left = Math.min(...corners.map((point) => point.x));
  const top = Math.min(...corners.map((point) => point.y));
  return {
    left,
    top,
    width: Math.max(...corners.map((point) => point.x)) - left,
    height: Math.max(...corners.map((point) => point.y)) - top,
  };
}

describe('Conductor visible Hero envelope during scroll', () => {
  let root: HTMLElement;
  let layoutRoot: HTMLElement;
  let driver: KeychainScrollController | undefined;
  let controlledTimeline: gsap.core.Timeline | undefined;
  let descriptors: [object, string, PropertyDescriptor | undefined][];

  const replace = (target: object, name: string, value: unknown): void => {
    descriptors.push([target, name, Object.getOwnPropertyDescriptor(target, name)]);
    Object.defineProperty(target, name, { configurable: true, writable: true, value });
  };

  beforeEach(() => {
    descriptors = [];
    driver = undefined;
    controlledTimeline = undefined;
    replace(
      window,
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('no-preference'),
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    replace(window, 'innerHeight', 800);
    replace(document.documentElement, 'scrollHeight', 6000);
    replace(document.body, 'scrollHeight', 6000);
    layoutRoot = document.createElement('div');
    root = document.createElement('div');
    root.innerHTML =
      '<div data-keychain="ro-modas" style="rotate:13deg"><div data-keychain-float><img alt=""></div></div>';
    layoutRoot.append(root);
    document.body.append(layoutRoot);
    vi.spyOn(gsap, 'registerPlugin').mockImplementation(() => {});
    vi.spyOn(ScrollTrigger, 'create').mockImplementation((variables) => {
      controlledTimeline = variables.animation as gsap.core.Timeline;
      return {
        progress: 0,
        kill: vi.fn(),
        getTween: vi.fn(() => ({ pause: vi.fn(), kill: vi.fn() })),
      } as unknown as ScrollTrigger;
    });
  });

  afterEach(() => {
    driver?.destroy();
    gsap.ticker.sleep();
    layoutRoot.remove();
    vi.restoreAllMocks();
    for (const [target, name, descriptor] of descriptors.reverse()) {
      if (descriptor) Object.defineProperty(target, name, descriptor);
      else Reflect.deleteProperty(target, name);
    }
  });

  it.each([320, 390, 768, 1024, 1440])(
    'keeps the enlarged original and its float extremes clear of copy at %ipx',
    (width) => {
      replace(window, 'innerWidth', width);
      const { input, leader, copy } = fixture(width);
      const route = buildKeychainRoute(input);
      expect(route.issues).toEqual([]);
      expect(route.valid).toBe(true);
      let snapshot: KeychainRouteSnapshot = {
        route,
        progress: 0,
        position: input.origin,
        geometry: {
          leader,
          members: [{ id: 'ro-modas', rect: leader }],
          footprint: input.footprint,
          formation: input.formation,
          surface: { width, height: input.sections.contact.top + input.sections.contact.height },
          obstacles: input.obstacles.map((obstacle) => obstacle.rect),
          documentTop: 0,
        },
      };
      const controller: KeychainRouteController = {
        getSnapshot: () => snapshot,
        setProgress: (progress) => {
          snapshot = { ...snapshot, progress, position: sampleKeychainRoute(route, progress) };
        },
        refresh: () => {},
        destroy: () => {},
      };
      driver = setupKeychainScroll(root, layoutRoot, controller);
      expect(controlledTimeline).toBeDefined();
      const timeline = controlledTimeline!;
      const segments = timeline.getChildren(false, true, false);
      expect(segments.length).toBe(route.points.length - 1);
      // The first two real tween segments end at hero-front and hero-right respectively.
      const heroFrontTime = segments[0].endTime() / timeline.duration();
      const heroRightTime = segments[1].endTime() / timeline.duration();
      const samples = [
        ...Array.from({ length: 201 }, (_, index) => (index / 200) * heroRightTime),
        heroFrontTime,
        heroRightTime,
      ].sort((a, b) => a - b);
      const element = root.firstElementChild as HTMLElement;
      let peakScale = 0;
      let count = 0;
      for (const time of samples) {
        timeline.progress(time);
        const values = element.style.transform.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? [];
        // The transform name contributes '3', followed by x/y/z/angle/scale.
        const numbers = values.map(Number).slice(1);
        expect(numbers.length).toBe(5);
        const motion = [numbers[0], numbers[1], numbers[3], numbers[4]];
        peakScale = Math.max(peakScale, motion[3]);
        for (const floatY of [-1, 1]) {
          for (const floatAngle of [-1, 1]) {
            const bounds = visibleBounds(
              leader,
              input.origin,
              motion,
              floatY * animationConfig.keychains.floatDistancePx,
              floatAngle * animationConfig.keychains.floatRotationDegrees,
            );
            const detail = JSON.stringify({ width, time, motion, floatY, floatAngle, bounds });
            expect(bounds.left, detail).toBeGreaterThanOrEqual(-1e-6);
            expect(bounds.left + bounds.width, detail).toBeLessThanOrEqual(width + 1e-6);
            const overlapsCopy =
              bounds.left < copy.left + copy.width - 1e-6 &&
              bounds.left + bounds.width > copy.left + 1e-6 &&
              bounds.top < copy.top + copy.height - 1e-6 &&
              bounds.top + bounds.height > copy.top + 1e-6;
            expect(overlapsCopy, detail).toBe(false);
            if (width < 768) {
              expect(bounds.top + bounds.height, detail).toBeLessThanOrEqual(
                input.heroScene.height + 1e-6,
              );
            }
            count++;
          }
        }
      }
      expect(count).toBe(812);
      expect(peakScale).toBeCloseTo(animationConfig.keychains.frontScale, 5);
      // GSAP rounds proxy values; the sampled endpoint can differ by a few thousandths of a pixel.
      expect(snapshot.position?.x).toBeCloseTo(
        route.points.find((point) => point.key === 'hero-right')!.x,
        2,
      );
      expect(snapshot.position?.y).toBeCloseTo(
        route.points.find((point) => point.key === 'hero-right')!.y,
        2,
      );
    },
  );
});
