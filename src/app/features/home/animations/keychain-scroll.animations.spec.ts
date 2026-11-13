import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { type MockInstance } from 'vitest';
import { animationConfig } from '../../../core/config/animation.config';
import { type KeychainMotionFrame } from './keychain-motion.model';
import { sampleKeychainRoute, type KeychainRoute } from './keychain-route.geometry';
import { type KeychainRouteController, type KeychainRouteSnapshot } from './keychain-route-layout';
import { setupKeychainScroll, type KeychainScrollController } from './keychain-scroll.animations';

interface ControlledTrigger {
  progress: number;
  kill: ReturnType<typeof vi.fn>;
  getTween: ReturnType<typeof vi.fn>;
}

function route(scale = 1): KeychainRoute {
  const points = [
    { x: 80, y: 100, key: 'origin', side: 'origin' },
    { x: 260, y: 200, key: 'hero-front', side: 'front' },
    { x: 370, y: 300, key: 'hero-right', side: 'right' },
    { x: 370, y: 700, key: 'about-right', side: 'right' },
    { x: 30, y: 700, key: 'before-course-left', side: 'left' },
    { x: 30, y: 1200, key: 'course-left', side: 'left' },
    { x: 370, y: 1200, key: 'before-contact-right', side: 'right' },
    { x: 370, y: 1500, key: 'contact-right', side: 'right' },
    { x: 370, y: 1800, key: 'contact-arrival-right', side: 'right' },
    { x: 200, y: 1800, key: 'contact-arrival', side: 'arrival' },
  ].map((point) => ({
    ...point,
    x: point.x * scale,
    y: point.y * scale,
  })) as KeychainRoute['points'];
  const totalLength = points.reduce(
    (total, point, index) =>
      index ? total + Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y) : 0,
    0,
  );
  return {
    points,
    totalLength,
    valid: true,
    issues: [],
    requiredSpacing: { beforeCourse: 0, beforeContact: 0, formationHeight: 80 },
  };
}

describe('Scroll-driven keychain group', () => {
  let root: HTMLElement;
  let layoutRoot: HTMLElement;
  let leader: HTMLElement;
  let follower: HTMLElement;
  let inner: HTMLElement;
  let snapshot: KeychainRouteSnapshot;
  let layout: KeychainRouteController;
  let driver: KeychainScrollController;
  let reduced: boolean;
  let initialScroll: number;
  let variables: ScrollTrigger.Vars[];
  let triggers: ControlledTrigger[];
  let scrubPause: ReturnType<typeof vi.fn>;
  let scrubKill: ReturnType<typeof vi.fn>;
  let descriptors: [object, string, PropertyDescriptor | undefined][];
  let timelineSpy: MockInstance<typeof gsap.timeline>;

  const replace = (target: object, name: string, value: unknown): void => {
    descriptors.push([target, name, Object.getOwnPropertyDescriptor(target, name)]);
    Object.defineProperty(target, name, { configurable: true, writable: true, value });
  };

  beforeEach(() => {
    descriptors = [];
    reduced = false;
    initialScroll = 0;
    variables = [];
    triggers = [];
    scrubPause = vi.fn();
    scrubKill = vi.fn();
    driver = { refresh: () => {}, destroy: () => {} };
    replace(
      window,
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('no-preference') ? !reduced : reduced,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    replace(window, 'innerHeight', 800);
    replace(document.documentElement, 'scrollHeight', 2000);
    replace(document.body, 'scrollHeight', 2000);
    layoutRoot = document.createElement('div');
    root = document.createElement('div');
    root.innerHTML =
      '<div data-keychain="ro-modas"><div data-keychain-float><img alt=""></div></div><div data-keychain="ro-cabelos"><img alt=""></div>';
    layoutRoot.append(root);
    document.body.append(layoutRoot);
    leader = root.querySelector<HTMLElement>('[data-keychain="ro-modas"]')!;
    follower = root.querySelector<HTMLElement>('[data-keychain="ro-cabelos"]')!;
    inner = leader.firstElementChild as HTMLElement;
    leader.style.setProperty('rotate', '13deg', 'important');
    leader.style.setProperty('transform', 'translateZ(0)', 'important');
    leader.style.aspectRatio = '1/2';
    inner.style.transform = 'translateY(3px) rotate(1deg)';
    follower.style.setProperty('transform', 'translateY(7px)', 'important');
    follower.style.setProperty('rotate', '-16deg', 'important');
    snapshot = {
      route: route(),
      progress: 0,
      position: { x: 80, y: 100 },
      geometry: {
        documentTop: 0,
        surface: { width: 400, height: 1880 },
        obstacles: [],
        leader: { left: 60, top: 60, width: 40, height: 80 },
        footprint: { width: 24, height: 64 },
        formation: { left: 50, top: 1760, width: 300, height: 80 },
        members: [
          { id: 'ro-modas', rect: { left: 60, top: 60, width: 40, height: 80 } },
          { id: 'ro-cabelos', rect: { left: 140, top: 50, width: 50, height: 100 } },
        ],
      },
    };
    layout = {
      getSnapshot: vi.fn(() => snapshot),
      setProgress: vi.fn((progress) => {
        snapshot = {
          ...snapshot,
          progress,
          position: snapshot.route?.valid ? sampleKeychainRoute(snapshot.route, progress) : null,
        };
      }),
      refresh: vi.fn(),
      destroy: vi.fn(),
    };
    vi.spyOn(gsap, 'registerPlugin').mockImplementation(() => {});
    vi.spyOn(ScrollTrigger, 'create').mockImplementation((vars) => {
      variables.push(vars);
      const trigger = {
        progress: initialScroll,
        kill: vi.fn(),
        getTween: vi.fn(() => ({ pause: scrubPause, kill: scrubKill })),
      };
      triggers.push(trigger);
      vars.onRefreshInit?.(trigger as unknown as ScrollTrigger);
      vars.onRefresh?.(trigger as unknown as ScrollTrigger);
      return trigger as unknown as ScrollTrigger;
    });
    timelineSpy = vi.spyOn(gsap, 'timeline');
  });

  afterEach(() => {
    driver.destroy();
    gsap.ticker.sleep();
    layoutRoot.remove();
    vi.restoreAllMocks();
    for (const [target, name, descriptor] of descriptors.reverse()) {
      if (descriptor) Object.defineProperty(target, name, descriptor);
      else Reflect.deleteProperty(target, name);
    }
  });

  const timeline = (): gsap.core.Timeline =>
    timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
  const motion = (element = leader): number[] => {
    const values = element.style.transform.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? [];
    // translate3d contributes its name's '3', followed by x, y, z, angle and scale.
    return values.map(Number).slice(1);
  };
  const expectPosition = (): void => {
    const point = sampleKeychainRoute(snapshot.route!, snapshot.progress);
    const rect = snapshot.geometry!.members.find((member) => member.id === 'ro-modas')!.rect;
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const [x, y] = motion();
    const approach = snapshot.route!.points.at(-2)!;
    if (point.y === approach.y && point.x < approach.x) {
      const area = snapshot.geometry!.formation;
      expect(origin.x + x).toBeGreaterThan(area.left);
      expect(origin.x + x).toBeLessThan(approach.x);
      expect(origin.y + y).toBeCloseTo(area.top + area.height / 2, 5);
    } else {
      expect(x).toBeCloseTo(point.x - origin.x, 5);
      expect(y).toBeCloseTo(point.y - origin.y, 5);
    }
  };

  it('uses one reversible scrub timeline and leaves inner/image motion independent', () => {
    driver = setupKeychainScroll(root, layoutRoot, layout);
    expect(variables[0].scrub).toBe(animationConfig.keychains.scrub);
    expect(variables[0].pin).toBeUndefined();
    expect(timeline().duration()).toBeCloseTo(1);
    timeline().progress(0.2);
    const firstProgress = snapshot.progress;
    const firstTransform = leader.style.transform;
    const firstFollower = follower.style.transform;
    expect(firstProgress).toBeGreaterThan(0);
    expectPosition();
    timeline().progress(0.8);
    expect(snapshot.progress).toBeGreaterThan(firstProgress);
    expectPosition();
    timeline().progress(0.2);
    expect(snapshot.progress).toBeCloseTo(firstProgress, 6);
    expect(leader.style.transform).toBe(firstTransform);
    expect(leader.style.rotate).toBe('none');
    expect(inner.style.transform).toBe('translateY(3px) rotate(1deg)');
    expect(follower.style.transform).toBe(firstFollower);
    expect(follower.style.transform).not.toBe('translateY(7px)');
  });

  it('keeps each source pose at zero and captures its own origin without a delayed teleport', () => {
    driver = setupKeychainScroll(root, layoutRoot, layout);
    expect(motion(leader)).toEqual([0, 0, 0, 13, 1]);
    expect(motion(follower)).toEqual([0, 0, 0, -16, 1]);
    timeline().progress(0.001);
    const [x, y] = motion(follower);
    expect(Math.hypot(x, y)).toBeLessThan(1e-6);
    timeline().progress(0.15);
    const moved = motion(follower);
    expect(Math.hypot(moved[0], moved[1])).toBeGreaterThan(0);
    timeline().progress(0);
    expect(motion(follower)).toEqual([0, 0, 0, -16, 1]);
  });

  it('keeps followers on the safe polyline with a short distance lag and individual fitting', () => {
    const tall = document.createElement('div');
    tall.dataset['keychain'] = 'v-motos-racing';
    tall.innerHTML = '<div data-keychain-float><img alt=""></div>';
    root.append(tall);
    snapshot = {
      ...snapshot,
      geometry: {
        ...snapshot.geometry!,
        members: [
          ...snapshot.geometry!.members,
          { id: 'v-motos-racing', rect: { left: 75, top: 180, width: 20, height: 130 } },
        ],
      },
    };
    driver = setupKeychainScroll(root, layoutRoot, layout);
    timeline().progress(0.65);
    const arcAt = (x: number, y: number): number => {
      let travelled = 0;
      for (let index = 1; index < snapshot.route!.points.length; index++) {
        const from = snapshot.route!.points[index - 1];
        const to = snapshot.route!.points[index];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        const fraction = Math.max(
          0,
          Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / (length * length)),
        );
        if (Math.hypot(x - from.x - dx * fraction, y - from.y - dy * fraction) < 1e-5) {
          return travelled + length * fraction;
        }
        travelled += length;
      }
      throw new Error('Member centre left the validated polyline');
    };
    const arcs = [leader, follower, tall].map((element, index) => {
      const rect = snapshot.geometry!.members[index].rect;
      const [x, y, , angle, scale] = motion(element);
      expect(angle).toBe(0);
      const radians = (animationConfig.keychains.floatRotationDegrees * Math.PI) / 180;
      const width = (rect.width * Math.cos(radians) + rect.height * Math.sin(radians)) * scale;
      const height =
        (rect.height * Math.cos(radians) +
          rect.width * Math.sin(radians) +
          2 * animationConfig.keychains.floatDistancePx) *
        scale;
      expect(width).toBeLessThanOrEqual(snapshot.geometry!.footprint.width + 1e-6);
      expect(height).toBeLessThanOrEqual(snapshot.geometry!.footprint.height + 1e-6);
      return arcAt(rect.left + rect.width / 2 + x, rect.top + rect.height / 2 + y);
    });
    expect(arcs[0]).toBeGreaterThan(arcs[1]);
    expect(arcs[1]).toBeGreaterThan(arcs[2]);
    expect(arcs[0] - arcs[2]).toBeLessThan(snapshot.geometry!.footprint.height * 2);
    const held = [leader, follower, tall].map((element) => element.style.transform);
    timeline().progress(0.9);
    timeline().progress(0.65);
    expect([leader, follower, tall].map((element) => element.style.transform)).toEqual(held);
  });

  it('ignores unrendered and unmeasured objects instead of inventing geometry', () => {
    const blocked = document.createElement('div');
    blocked.dataset['keychain'] = 'e4kc-motorsport';
    blocked.style.transform = 'translateX(2px)';
    root.append(blocked);
    const unmeasured = document.createElement('div');
    unmeasured.dataset['keychain'] = 'pending';
    unmeasured.innerHTML = '<img alt="">';
    unmeasured.style.transform = 'translateY(2px)';
    root.append(unmeasured);
    driver = setupKeychainScroll(root, layoutRoot, layout);
    timeline().progress(0.8);
    expect(blocked.style.transform).toBe('translateX(2px)');
    expect(blocked.style.rotate).toBe('');
    expect(unmeasured.style.transform).toBe('translateY(2px)');
    expect(unmeasured.style.rotate).toBe('');
  });

  it('restores discarded members on refresh while retaining active poses and master progress', () => {
    driver = setupKeychainScroll(root, layoutRoot, layout);
    timeline().progress(0.6);
    const progress = snapshot.progress;
    const leaderHeld = leader.style.transform;
    const followerHeld = follower.style.transform;
    const members = snapshot.geometry!.members;
    expect(followerHeld).not.toBe('translateY(7px)');
    snapshot = {
      ...snapshot,
      geometry: {
        ...snapshot.geometry!,
        members: members.filter((member) => member.id !== 'ro-cabelos'),
      },
    };
    driver.refresh();
    expect(snapshot.progress).toBeCloseTo(progress, 6);
    expect(leader.style.transform).toBe(leaderHeld);
    expect(follower.style.transform).toBe('translateY(7px)');
    expect(follower.style.getPropertyPriority('transform')).toBe('important');
    expect(follower.style.rotate).toBe('-16deg');
    expect(follower.style.getPropertyPriority('rotate')).toBe('important');
    snapshot = { ...snapshot, geometry: { ...snapshot.geometry!, members } };
    driver.refresh();
    expect(snapshot.progress).toBeCloseTo(progress, 6);
    expect(leader.style.transform).toBe(leaderHeld);
    expect(follower.style.transform).toBe(followerHeld);
    expect(follower.style.rotate).toBe('none');
  });

  it('starts from the real ScrollTrigger progress for restored or deep-linked scroll', () => {
    initialScroll = 0.64;
    driver = setupKeychainScroll(root, layoutRoot, layout);
    expect(timeline().progress()).toBeCloseTo(0.64);
    expect(snapshot.progress).toBeGreaterThan(0);
    expect(scrubPause).toHaveBeenCalled();
    expectPosition();
  });

  it('preserves path progress on geometry and global refresh without emitting an origin frame', () => {
    driver = setupKeychainScroll(root, layoutRoot, layout);
    timeline().progress(0.43);
    const held = snapshot.progress;
    snapshot = {
      ...snapshot,
      route: route(1.2),
      geometry: {
        ...snapshot.geometry!,
        formation: { left: 60, top: 2112, width: 360, height: 96 },
      },
    };
    const writes = vi.spyOn(leader.style, 'setProperty');
    driver.refresh();
    expect(snapshot.progress).toBeCloseTo(held, 6);
    expect(timelineSpy).toHaveBeenCalledTimes(1);
    expect(triggers[0].kill).toHaveBeenCalledWith(false, true);
    expect(scrubKill).toHaveBeenCalled();
    expectPosition();
    expect(
      writes.mock.calls.some(
        ([name, value]) => name === 'transform' && value?.startsWith('translate3d(0px, 0px,'),
      ),
    ).toBe(false);

    const vars = variables.at(-1)!;
    const trigger = triggers.at(-1)! as unknown as ScrollTrigger;
    vars.onRefreshInit?.(trigger);
    timeline().progress(0);
    expect(snapshot.progress).toBeCloseTo(held, 6);
    vars.onRefresh?.(trigger);
    expect(snapshot.progress).toBeCloseTo(held, 6);
    expectPosition();
    const followerHeld = follower.style.transform;
    vars.onRefreshInit?.(trigger);
    timeline().progress(1);
    vars.onRefresh?.(trigger);
    expect(follower.style.transform).toBe(followerHeld);
    expect(scrubPause).toHaveBeenCalled();
  });

  it('fits the travelling envelope and clamps the scroll end to the real document range', () => {
    driver = setupKeychainScroll(root, layoutRoot, layout);
    timeline().progress(1);
    const [, , , angle, scale] = motion();
    expect(angle).toBeCloseTo(0);
    const radians = (animationConfig.keychains.floatRotationDegrees * Math.PI) / 180;
    const width = 40 * Math.cos(radians) + 80 * Math.sin(radians);
    const height =
      80 * Math.cos(radians) +
      40 * Math.sin(radians) +
      2 * animationConfig.keychains.floatDistancePx;
    expect(width * scale).toBeLessThanOrEqual(24 + 1e-6);
    expect(height * scale).toBeLessThanOrEqual(64 + 1e-6);
    const end = variables[0].end as () => number;
    expect(end()).toBe(1200);
    expectPosition();
  });

  const centre = (element: HTMLElement): { x: number; y: number; scale: number } => {
    const rect = snapshot.geometry!.members.find(
      (member) => member.id === element.dataset['keychain'],
    )!.rect;
    const [x, y, , , scale] = motion(element);
    return { x: rect.left + rect.width / 2 + x, y: rect.top + rect.height / 2 + y, scale };
  };

  it('reserves scroll time and reversibly aligns every member below the social controls', () => {
    driver = setupKeychainScroll(root, layoutRoot, layout);
    const segments = timeline().getChildren(false, true, false);
    const last = segments.at(-1)!;
    expect(last.duration() / timeline().duration()).toBeGreaterThanOrEqual(
      animationConfig.keychains.formationScrollShare - 1e-6,
    );
    timeline().progress(0.8);
    const before = [leader, follower].map((element) => element.style.transform);
    timeline().progress(1);
    const first = centre(leader);
    const second = centre(follower);
    expect(first.y).toBeCloseTo(1800, 6);
    expect(second.y).toBeCloseTo(1800, 6);
    expect(first.x).toBeLessThan(second.x);
    expect((first.x + second.x) / 2).toBeCloseTo(200, 6);
    expect(second.x - first.x).toBeCloseTo(
      24 + 24 * animationConfig.keychains.formationGapRatio,
      5,
    );
    expect(inner.style.transform).toBe('translateY(3px) rotate(1deg)');
    const final = [leader, follower].map((element) => element.style.transform);
    timeline().progress(0.8);
    expect([leader, follower].map((element) => element.style.transform)).toEqual(before);
    timeline().progress(1);
    expect([leader, follower].map((element) => element.style.transform)).toEqual(final);
  });

  it('catches the delayed members up on the corridor before their horizontal formation', () => {
    driver = setupKeychainScroll(root, layoutRoot, layout);
    const segments = timeline().getChildren(false, true, false);
    const catchup = segments.find((segment) => {
      timeline().time(segment.endTime());
      return Math.abs(snapshot.position!.y - 1500) < 1e-2;
    })!;
    timeline().time(catchup.endTime());
    const initialGap = centre(leader).y - centre(follower).y;
    expect(initialGap).toBeGreaterThan(0);
    const arrival = segments.at(-2)!;
    timeline().time((catchup.endTime() + arrival.endTime()) / 2);
    const laterGap = centre(leader).y - centre(follower).y;
    expect(laterGap).toBeGreaterThan(0);
    expect(laterGap).toBeLessThan(initialGap);
    for (const element of [leader, follower]) expect(centre(element).x).toBeCloseTo(370, 4);
    // The follower remains on the right edge until it reaches the protected arrival height.
    timeline().time(arrival.endTime());
    expect(centre(follower).x).toBeCloseTo(370, 4);
    expect(centre(follower).y).toBeLessThan(1800);
    timeline().progress(1);
    expect(centre(follower).y).toBeCloseTo(1800, 5);
  });

  it('renders a fully aligned formation when mounted at the end of restored scroll', () => {
    initialScroll = 1;
    driver = setupKeychainScroll(root, layoutRoot, layout);
    expect(snapshot.progress).toBe(1);
    expect(centre(leader).y).toBeCloseTo(centre(follower).y, 6);
    expect(centre(leader).x).toBeLessThan(centre(follower).x);
    expect(centre(leader).x).toBeGreaterThan(snapshot.geometry!.formation.left);
    expect(centre(follower).x).toBeLessThan(
      snapshot.geometry!.formation.left + snapshot.geometry!.formation.width,
    );
  });

  it('reflows a completed formation after resizing without losing the held scroll progress', () => {
    driver = setupKeychainScroll(root, layoutRoot, layout);
    timeline().progress(1);
    const first = centre(leader);
    snapshot = {
      ...snapshot,
      geometry: {
        ...snapshot.geometry!,
        formation: { left: 190, top: 1760, width: 20, height: 80 },
      },
    };
    driver.refresh();
    expect(snapshot.progress).toBe(1);
    const next = centre(leader);
    expect(next.scale).toBeLessThan(first.scale);
    expect(next.y).toBeCloseTo(1800, 6);
    expect(next.x).toBeGreaterThan(198);
    expect(centre(follower).x).toBeLessThan(202);
    expect(inner.style.transform).toBe('translateY(3px) rotate(1deg)');
    const held = [leader, follower].map((element) => element.style.transform);
    const vars = variables.at(-1)!;
    const trigger = triggers.at(-1)! as unknown as ScrollTrigger;
    vars.onRefreshInit?.(trigger);
    timeline().progress(0);
    vars.onRefresh?.(trigger);
    expect([leader, follower].map((element) => element.style.transform)).toEqual(held);
  });

  it('keeps the entire group static if the formation is invalid or the arrival would be diagonal', () => {
    snapshot = {
      ...snapshot,
      geometry: { ...snapshot.geometry!, formation: { left: 50, top: 1760, width: 0, height: 80 } },
    };
    driver = setupKeychainScroll(root, layoutRoot, layout);
    expect(ScrollTrigger.create).not.toHaveBeenCalled();
    expect(leader.style.transform).toBe('translateZ(0)');
    expect(follower.style.transform).toBe('translateY(7px)');
    snapshot = {
      ...snapshot,
      geometry: {
        ...snapshot.geometry!,
        formation: { left: 50, top: 1700, width: 300, height: 80 },
      },
    };
    driver.refresh();
    expect(ScrollTrigger.create).not.toHaveBeenCalled();
    expect(leader.style.transform).toBe('translateZ(0)');
    expect(follower.style.transform).toBe('translateY(7px)');
  });

  it('does not measure layout or read computed styles on animation frames', () => {
    driver = setupKeychainScroll(root, layoutRoot, layout);
    const computed = vi.spyOn(window, 'getComputedStyle');
    const bounds = vi.spyOn(layoutRoot, 'getBoundingClientRect');
    const leaderBounds = vi.spyOn(leader, 'getBoundingClientRect');
    for (const progress of [0.1, 0.4, 0.7, 0.9, 0.2]) timeline().progress(progress);
    expect(computed).not.toHaveBeenCalled();
    expect(bounds).not.toHaveBeenCalled();
    expect(leaderBounds).not.toHaveBeenCalled();
  });

  it('keeps invalid geometry static and restores original styles and only its own resources', () => {
    snapshot = { ...snapshot, route: { ...snapshot.route!, valid: false } };
    driver = setupKeychainScroll(root, layoutRoot, layout);
    expect(ScrollTrigger.create).not.toHaveBeenCalled();
    expect(leader.style.transform).toBe('translateZ(0)');
    snapshot = { ...snapshot, route: route() };
    driver.refresh();
    timeline().progress(0.5);
    driver.destroy();
    driver.destroy();
    expect(triggers.at(-1)?.kill).toHaveBeenCalledWith(false, true);
    expect(scrubKill).toHaveBeenCalled();
    expect(timeline().isActive()).toBe(false);
    expect(leader.style.transform).toBe('translateZ(0)');
    expect(leader.style.getPropertyPriority('transform')).toBe('important');
    expect(leader.style.rotate).toBe('13deg');
    expect(leader.style.getPropertyPriority('rotate')).toBe('important');
    expect(leader.style.aspectRatio).toBe('1/2');
    expect(inner.style.transform).toBe('translateY(3px) rotate(1deg)');
    expect(follower.style.transform).toBe('translateY(7px)');
    expect(follower.style.getPropertyPriority('transform')).toBe('important');
    expect(follower.style.rotate).toBe('-16deg');
    expect(follower.style.getPropertyPriority('rotate')).toBe('important');
  });

  it('publishes the actual group wrappers and final row slots rather than the nominal route centre', () => {
    const onFrame = vi.fn<(frame: KeychainMotionFrame) => void>();
    driver = setupKeychainScroll(root, layoutRoot, layout, { onFrame });
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(onFrame.mock.lastCall![0]).toEqual({
      progress: 0,
      reason: 'reset',
      members: [
        { id: 'ro-modas', x: 80, y: 100, width: 40, height: 80 },
        { id: 'ro-cabelos', x: 165, y: 100, width: 50, height: 100 },
      ],
    });
    timeline().progress(0.42);
    const travelling = onFrame.mock.lastCall![0];
    expect(travelling.reason).toBe('motion');
    expect(travelling.progress).toBeCloseTo(snapshot.progress, 6);
    for (const [index, element] of [leader, follower].entries()) {
      const member = travelling.members[index];
      const rect = snapshot.geometry!.members[index].rect;
      const pose = centre(element);
      expect(member.id).toBe(element.dataset['keychain']);
      expect(member.x).toBeCloseTo(pose.x, 6);
      expect(member.y).toBeCloseTo(pose.y, 6);
      expect(member.width).toBeCloseTo(rect.width * pose.scale, 6);
      expect(member.height).toBeCloseTo(rect.height * pose.scale, 6);
    }
    expect(travelling.members[0].y).toBeGreaterThan(travelling.members[1].y);
    timeline().progress(1);
    const final = onFrame.mock.lastCall![0];
    expect(final.reason).toBe('motion');
    expect(final.members[0].x).toBeCloseTo(centre(leader).x, 6);
    expect(final.members[1].x).toBeCloseTo(centre(follower).x, 6);
    expect(final.members[0].y).toBeCloseTo(1800, 6);
    expect(final.members[1].y).toBeCloseTo(1800, 6);
    expect(final.members[0].x).toBeLessThan(snapshot.position!.x);
    expect(final.members[1].x).toBeGreaterThan(snapshot.position!.x);
  });

  it('publishes reset frames only during geometry and global refresh', () => {
    const onFrame = vi.fn<(frame: KeychainMotionFrame) => void>();
    driver = setupKeychainScroll(root, layoutRoot, layout, { onFrame });
    timeline().progress(0.43);
    const held = snapshot.progress;
    onFrame.mockClear();
    driver.refresh();
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(onFrame.mock.lastCall![0].reason).toBe('reset');
    expect(onFrame.mock.lastCall![0].progress).toBeCloseTo(held, 6);
    expect(onFrame.mock.lastCall![0].members).toHaveLength(2);
    onFrame.mockClear();
    const vars = variables.at(-1)!;
    const trigger = triggers.at(-1)! as unknown as ScrollTrigger;
    vars.onRefreshInit?.(trigger);
    timeline().progress(0);
    expect(onFrame).not.toHaveBeenCalled();
    vars.onRefresh?.(trigger);
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(onFrame.mock.lastCall![0].reason).toBe('reset');
    expect(onFrame.mock.lastCall![0].progress).toBeCloseTo(held, 6);
  });

  it('keeps inner floating transforms independent of movement-frame publication', () => {
    const onFrame = vi.fn<(frame: KeychainMotionFrame) => void>();
    driver = setupKeychainScroll(root, layoutRoot, layout, { onFrame });
    timeline().progress(0.4);
    const calls = onFrame.mock.calls.length;
    const float = gsap.to(inner, { y: 9, rotation: 2, duration: 1, paused: true });
    try {
      float.progress(0.5);
      expect(onFrame).toHaveBeenCalledTimes(calls);
      timeline().progress(0.6);
      expect(onFrame).toHaveBeenCalledTimes(calls + 1);
      expect(onFrame.mock.lastCall![0].reason).toBe('motion');
    } finally {
      float.kill();
    }
  });

  it('clears invalid, reduced and destroyed movement once and emits nothing after cleanup', async () => {
    const onFrame = vi.fn<(frame: KeychainMotionFrame) => void>();
    driver = setupKeychainScroll(root, layoutRoot, layout, { onFrame });
    timeline().progress(0.4);
    const valid = snapshot.route!;
    snapshot = { ...snapshot, route: { ...valid, valid: false } };
    onFrame.mockClear();
    driver.refresh();
    driver.refresh();
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(onFrame.mock.lastCall![0]).toEqual({
      progress: snapshot.progress,
      reason: 'reset',
      members: [],
    });
    snapshot = { ...snapshot, route: valid };
    driver.refresh();
    expect(onFrame.mock.lastCall![0].members).toHaveLength(2);
    onFrame.mockClear();
    reduced = true;
    // Respect GSAP's two-millisecond native media-change throttle.
    await new Promise((resolve) => setTimeout(resolve, 5));
    gsap.matchMediaRefresh();
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(onFrame.mock.lastCall![0].reason).toBe('reset');
    expect(onFrame.mock.lastCall![0].members).toEqual([]);
    reduced = false;
    // Respect GSAP's two-millisecond native media-change throttle.
    await new Promise((resolve) => setTimeout(resolve, 5));
    gsap.matchMediaRefresh();
    expect(onFrame.mock.lastCall![0].members).toHaveLength(2);
    onFrame.mockClear();
    driver.destroy();
    driver.destroy();
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(onFrame.mock.lastCall![0].members).toEqual([]);
    const finalTrigger = triggers.at(-1)! as unknown as ScrollTrigger;
    const finalVars = variables.at(-1)!;
    timeline().progress(0.7);
    finalVars.onRefreshInit?.(finalTrigger);
    finalVars.onRefresh?.(finalTrigger);
    driver.refresh();
    expect(onFrame).toHaveBeenCalledTimes(1);
  });

  it('publishes an empty reset for initial reduced motion or missing rendered assets', () => {
    const onFrame = vi.fn<(frame: KeychainMotionFrame) => void>();
    reduced = true;
    driver = setupKeychainScroll(root, layoutRoot, layout, { onFrame });
    expect(onFrame.mock.calls).toEqual([[{ progress: 0, reason: 'reset', members: [] }]]);
    driver.destroy();
    expect(onFrame).toHaveBeenCalledTimes(1);
    onFrame.mockClear();
    root.replaceChildren();
    driver = setupKeychainScroll(root, layoutRoot, layout, { onFrame });
    driver.refresh();
    driver.destroy();
    expect(onFrame.mock.calls).toEqual([[{ progress: 0, reason: 'reset', members: [] }]]);
  });

  it('honours reduced motion initially and when that preference changes at runtime', async () => {
    reduced = true;
    driver = setupKeychainScroll(root, layoutRoot, layout);
    expect(ScrollTrigger.create).not.toHaveBeenCalled();
    expect(leader.style.transform).toBe('translateZ(0)');
    reduced = false;
    // Respect GSAP's two-millisecond native media-change throttle.
    await new Promise((resolve) => setTimeout(resolve, 5));
    gsap.matchMediaRefresh();
    expect(ScrollTrigger.create).toHaveBeenCalledTimes(1);
    reduced = true;
    // Respect GSAP's two-millisecond native media-change throttle.
    await new Promise((resolve) => setTimeout(resolve, 5));
    gsap.matchMediaRefresh();
    expect(triggers[0].kill).toHaveBeenCalledWith(false, true);
    expect(leader.style.transform).toBe('translateZ(0)');
    expect(leader.style.rotate).toBe('13deg');
  });
});
