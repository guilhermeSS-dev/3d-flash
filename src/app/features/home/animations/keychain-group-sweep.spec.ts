import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animationConfig } from '../../../core/config/animation.config';
import { siteAssets } from '../../../core/config/assets.config';
import {
  buildKeychainRoute,
  sampleKeychainRoute,
  type KeychainRouteInput,
  type RoutePosition,
  type RouteRect,
} from './keychain-route.geometry';
import { type KeychainRouteController, type KeychainRouteSnapshot } from './keychain-route-layout';
import { setupKeychainScroll, type KeychainScrollController } from './keychain-scroll.animations';

interface GroupMember {
  readonly id: string;
  readonly rect: RouteRect;
  readonly angle: number;
}

/** Logical positions from the source SCSS; image ratios use the supplied visible asset bounds. */
function groupFixture(width: number): {
  input: KeychainRouteInput;
  members: readonly GroupMember[];
} {
  const config = animationConfig.keychains;
  const gutter = Math.max(20, Math.min(width * 0.04, 64));
  const contentWidth = Math.min(width, 1280) - gutter * 2;
  const contentLeft = (width - Math.min(width, 1280)) / 2 + gutter;
  const mobile = width < 768;
  const scene = mobile
    ? { left: contentLeft, top: 0, width: contentWidth, height: Math.max(240, contentWidth / 1.13) }
    : {
        left: contentLeft + contentWidth * 0.43,
        top: 0,
        width: contentWidth * 0.57,
        height: width < 1024 ? 496 : Math.max(528, Math.min(width * 0.52, 752)),
      };
  const poses: Readonly<Record<string, readonly [number, number, number, number]>> = {
    'ro-modas': [mobile ? 0.05 : 0.04, mobile ? 0.22 : 0.12, 0.12, 13],
    'ro-cabelos': [mobile ? 0.25 : 0.24, mobile ? 0.22 : 0.12, 0.12, 10],
    'brasileira-acai': [0.03, mobile ? 0.46 : 0.37, 0.12, -13],
    'leca-tintas': [0.23, mobile ? 0.46 : 0.37, 0.16, 16],
    'v-motos-racing': [mobile ? 0.08 : 0.05, mobile ? 0.71 : 0.66, mobile ? 0.08 : 0.09, -20],
  };
  const members = siteAssets.keychains
    .filter((asset) => asset.renderAllowed)
    .map((asset) => {
      const [x, y, ratio, angle] = poses[asset.id];
      const itemWidth = scene.width * ratio;
      return {
        id: asset.id,
        angle,
        rect: {
          left: scene.left + scene.width * x,
          top: scene.top + scene.height * y,
          width: itemWidth,
          height: (itemWidth * asset.bounds.height) / asset.bounds.width,
        },
      };
    });
  const leader = members[0].rect;
  const footprintWidth = Math.max(
    config.routeWidthMinPx,
    Math.min(width * config.routeWidthRatio, config.routeWidthMaxPx),
  );
  const footprint = {
    width: footprintWidth,
    height: footprintWidth * config.routeHeightRatio + config.floatDistancePx * 2,
  };
  const corridor = Math.ceil(footprint.width + config.routeClearancePx * 2);
  const heroHeight = scene.height + (mobile ? 300 : 0);
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
  const heroCopy = mobile
    ? content(scene.height + 18, 240)
    : { left: contentLeft, top: 100, width: contentWidth * 0.43, height: 300 };
  return {
    members,
    input: {
      width,
      origin: { x: leader.left + leader.width / 2, y: leader.top + leader.height / 2 },
      heroScene: scene,
      sections,
      formation: content(sections.contact.top + 220, footprint.height + 40),
      footprint,
      clearance: config.routeClearancePx,
      corridor,
      obstacles: [
        { id: 'hero-copy-and-course-button', section: 'hero', rect: heroCopy },
        { id: 'about-copy', section: 'about', rect: content(sections.about.top + 80, 80) },
        { id: 'about-products', section: 'about', rect: content(sections.about.top + 180, 170) },
        { id: 'course-copy', section: 'course', rect: content(sections.course.top + 80, 80) },
        { id: 'course-product', section: 'course', rect: content(sections.course.top + 180, 210) },
        { id: 'course-button', section: 'course', rect: content(sections.course.top + 470, 50) },
        { id: 'contact-copy', section: 'contact', rect: content(sections.contact.top + 70, 70) },
        { id: 'social-buttons', section: 'contact', rect: content(sections.contact.top + 70, 70) },
      ],
    },
  };
}

/** Compose outer travel and inner float transforms to project every visible rectangle corner. */
function visibleBounds(
  rect: RouteRect,
  values: readonly number[],
  floatY: number,
  floatAngle: number,
): RouteRect {
  const [dx, dy, , angle, scale] = values;
  const outerAngle = (angle * Math.PI) / 180;
  const combinedAngle = ((angle + floatAngle) * Math.PI) / 180;
  const center: RoutePosition = {
    x: rect.left + rect.width / 2 + dx - Math.sin(outerAngle) * scale * floatY,
    y: rect.top + rect.height / 2 + dy + Math.cos(outerAngle) * scale * floatY,
  };
  const corners = [-1, 1].flatMap((x) =>
    [-1, 1].map((y) => ({
      x:
        center.x +
        (scale *
          (Math.cos(combinedAngle) * x * rect.width - Math.sin(combinedAngle) * y * rect.height)) /
          2,
      y:
        center.y +
        (scale *
          (Math.sin(combinedAngle) * x * rect.width + Math.cos(combinedAngle) * y * rect.height)) /
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

function overlaps(a: RouteRect, b: RouteRect): boolean {
  return (
    a.left < b.left + b.width - 1e-6 &&
    a.left + a.width > b.left + 1e-6 &&
    a.top < b.top + b.height - 1e-6 &&
    a.top + a.height > b.top + 1e-6
  );
}

function transformValues(element: HTMLElement): readonly number[] {
  return (
    element.style.transform
      .match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)
      ?.map(Number)
      .slice(1) ?? []
  );
}

/** Project an observed rendered centre onto the measured polyline, without copying lag tuning. */
function distanceAlong(points: readonly RoutePosition[], observed: RoutePosition): number {
  let distance = 0;
  let nearestError = Infinity;
  let nearestDistance = 0;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;
    const ratio = Math.max(
      0,
      Math.min(1, ((observed.x - from.x) * dx + (observed.y - from.y) * dy) / (length * length)),
    );
    const error = Math.hypot(observed.x - from.x - dx * ratio, observed.y - from.y - dy * ratio);
    if (error < nearestError) {
      nearestError = error;
      nearestDistance = distance + ratio * length;
    }
    distance += length;
  }
  expect(nearestError).toBeLessThan(0.001);
  return nearestDistance;
}

describe('Keychain group envelope across the complete reversible route', () => {
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
    replace(window, 'matchMedia', (query: string) => ({
      matches: query.includes('no-preference'),
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    replace(window, 'innerHeight', 800);
    replace(document.documentElement, 'scrollHeight', 6000);
    replace(document.body, 'scrollHeight', 6000);
    layoutRoot = document.createElement('div');
    root = document.createElement('div');
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

  it.each([320, 360, 390, 480, 600, 767, 768, 820, 1023, 1024, 1280, 1440, 1920, 2560])(
    'keeps all five originals clear of protected content throughout the route at %ipx',
    (width) => {
      replace(window, 'innerWidth', width);
      const { input, members } = groupFixture(width);
      root.innerHTML = members
        .map(
          (member) =>
            `<div data-keychain="${member.id}" style="rotate:${member.angle}deg"><div data-keychain-float><img alt=""></div></div>`,
        )
        .join('');
      const blocked = document.createElement('div');
      blocked.dataset['keychain'] = 'e4kc-motorsport';
      blocked.style.transform = 'translateZ(3px)';
      root.append(blocked);
      const route = buildKeychainRoute(input);
      expect(route.issues).toEqual([]);
      expect(route.valid).toBe(true);
      let snapshot: KeychainRouteSnapshot = {
        route,
        progress: 0,
        position: input.origin,
        geometry: {
          leader: members[0].rect,
          members,
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
      const elements = members.map((member) =>
        root.querySelector<HTMLElement>(`[data-keychain="${member.id}"]`)!,
      );
      const timeForMasterProgress = (progress: number): number => {
        if (progress <= 0) return 0;
        if (progress >= 1) return 1;
        let low = 0;
        let high = 1;
        for (let iteration = 0; iteration < 28; iteration++) {
          const middle = (low + high) / 2;
          timeline.progress(middle);
          if (snapshot.progress < progress) low = middle;
          else high = middle;
        }
        return (low + high) / 2;
      };
      const waypointDistances = [0];
      for (let index = 1; index < route.points.length; index++) {
        const from = route.points[index - 1];
        const to = route.points[index];
        waypointDistances.push(
          waypointDistances[index - 1] + Math.hypot(to.x - from.x, to.y - from.y),
        );
      }
      const courseIndex = route.points.findIndex((point) => point.key === 'course-left');
      expect(courseIndex).toBeGreaterThan(0);
      timeline.progress(timeForMasterProgress(waypointDistances[courseIndex] / route.totalLength));
      const masterDistance = snapshot.progress * route.totalLength;
      const travelScales = elements.map((element) => transformValues(element)[4]);
      const lags = members.map((member, index) => {
        const [dx, dy] = transformValues(elements[index]);
        const observed = {
          x: member.rect.left + member.rect.width / 2 + dx,
          y: member.rect.top + member.rect.height / 2 + dy,
        };
        return Math.max(0, masterDistance - distanceAlong(route.points, observed));
      });
      const catchupIndex = route.points.findIndex((point) => point.key === 'contact-right');
      // Lag is constant before catchup; include each follower's capture and pre-contact corners.
      const followerJoints = lags.flatMap((lag) =>
        waypointDistances
          .slice(0, catchupIndex + 1)
          .map((distance) => timeForMasterProgress((distance + lag) / route.totalLength)),
      );
      const samples = [
        ...new Set([
          ...Array.from({ length: 501 }, (_, index) => index / 500),
          ...followerJoints,
          0.94,
          0.98,
          1,
          ...timeline
            .getChildren(false, true, false)
            .map((segment) => segment.endTime() / timeline.duration()),
        ]),
      ].sort((a, b) => a - b);
      let envelopeChecks = 0;
      for (const time of samples) {
        timeline.progress(time);
        for (const [index, member] of members.entries()) {
          const transform = elements[index].style.transform;
          const numbers = transformValues(elements[index]);
          expect(numbers.length, `${member.id} must have its own outer travel transform`).toBe(5);
          for (const floatY of [-configDistance(), configDistance()]) {
            for (const floatAngle of [-configRotation(), configRotation()]) {
              const bounds = visibleBounds(member.rect, numbers, floatY, floatAngle);
              const detail = JSON.stringify({
                width,
                time,
                id: member.id,
                bounds,
                transform,
                floatY,
                floatAngle,
              });
              expect(bounds.left, detail).toBeGreaterThanOrEqual(-1e-6);
              expect(bounds.left + bounds.width, detail).toBeLessThanOrEqual(width + 1e-6);
              for (const obstacle of input.obstacles) {
                expect(overlaps(bounds, obstacle.rect), `${detail}; obstacle=${obstacle.id}`).toBe(
                  false,
                );
              }
              envelopeChecks++;
            }
          }
        }
      }
      expect(envelopeChecks).toBeGreaterThanOrEqual(10_020);
      timeline.progress(1);
      const formation = input.formation;
      const finalBounds = members.map((member, index) => {
        const values = transformValues(elements[index]);
        const [dx, dy, , angle, scale] = values;
        expect(member.rect.top + member.rect.height / 2 + dy).toBeCloseTo(
          formation.top + formation.height / 2,
          6,
        );
        expect(angle).toBe(0);
        expect(scale).toBeLessThanOrEqual(travelScales[index] + 1e-6);
        if (index > 0) {
          const [previousDx] = transformValues(elements[index - 1]);
          const previous = members[index - 1].rect;
          expect(member.rect.left + member.rect.width / 2 + dx).toBeGreaterThan(
            previous.left + previous.width / 2 + previousDx,
          );
        }
        const extremes = [-configDistance(), configDistance()].flatMap((floatY) =>
          [-configRotation(), configRotation()].map((floatAngle) =>
            visibleBounds(member.rect, values, floatY, floatAngle),
          ),
        );
        const left = Math.min(...extremes.map((rect) => rect.left));
        const top = Math.min(...extremes.map((rect) => rect.top));
        const right = Math.max(...extremes.map((rect) => rect.left + rect.width));
        const bottom = Math.max(...extremes.map((rect) => rect.top + rect.height));
        const clearance = animationConfig.keychains.routeClearancePx;
        expect(left).toBeGreaterThanOrEqual(formation.left + clearance - 1e-6);
        expect(right).toBeLessThanOrEqual(formation.left + formation.width - clearance + 1e-6);
        expect(top).toBeGreaterThanOrEqual(formation.top + clearance - 1e-6);
        expect(bottom).toBeLessThanOrEqual(formation.top + formation.height - clearance + 1e-6);
        return { left, top, width: right - left, height: bottom - top };
      });
      for (let index = 1; index < finalBounds.length; index++) {
        const previous = finalBounds[index - 1];
        const current = finalBounds[index];
        expect(current.left - previous.left - previous.width).toBeGreaterThanOrEqual(
          input.footprint.width * 0.35 - 1e-6,
        );
        expect(overlaps(previous, current)).toBe(false);
      }
      const checkpoints = [0.1, 0.35, 0.6, 0.9, 0.94, 0.98, 1];
      const forward = checkpoints.map((time) => {
        timeline.progress(time);
        return elements.map((element) => element.style.transform);
      });
      for (let index = checkpoints.length - 1; index >= 0; index--) {
        timeline.progress(checkpoints[index]);
        expect(elements.map((element) => element.style.transform)).toEqual(forward[index]);
      }
      expect(blocked.style.transform).toBe('translateZ(3px)');
    },
  );
});

const configDistance = (): number => animationConfig.keychains.floatDistancePx;
const configRotation = (): number => animationConfig.keychains.floatRotationDegrees;
