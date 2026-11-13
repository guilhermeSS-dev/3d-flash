import { animationConfig } from '../../../core/config/animation.config';
import { sampleKeychainRoute, type RouteRect } from './keychain-route.geometry';
import { setupKeychainRouteLayout, type KeychainRouteController } from './keychain-route-layout';

interface LayoutFixture {
  readonly root: HTMLElement;
  readonly origin: HTMLElement;
  readonly heroCopy: HTMLElement;
  readonly formation: HTMLElement;
  width: number;
  leaderWidth: number;
  leaderHeight: number;
  followerWidth: number;
  followerHeight: number;
  formationInset: number;
  reads: number;
}

/** Offset geometry only: these are coherent layout fixtures, not rendered viewports. */
function createLayout(tightGaps = false): LayoutFixture {
  const root = document.createElement('div');
  root.innerHTML = `
    <section id="inicio"><div data-keychain-origin-surface>
      <div data-origin>
        <div data-keychain="ro-modas"><img alt=""></div>
        <div data-keychain="ro-cabelos"><img alt=""></div>
        <div data-keychain="e4kc-motorsport"></div>
      </div>
    </div><div class="hero-copy-content" data-keychain-obstacle="hero-copy"></div></section>
    <section id="sobre"><div data-keychain-obstacle="about-copy"></div>
      <div data-keychain-obstacle="about-products"></div></section>
    <section id="curso"><div data-keychain-obstacle="course-copy"></div>
      <div data-keychain-obstacle="course-product"></div>
      <div data-keychain-obstacle="course-action"></div></section>
    <section id="contato"><div data-keychain-obstacle="contact-copy"></div>
      <div data-keychain-formation></div></section>`;
  document.body.append(root);
  const origin = root.querySelector<HTMLElement>('[data-origin]')!;
  const heroCopy = root.querySelector<HTMLElement>('.hero-copy-content')!;
  const formation = root.querySelector<HTMLElement>('[data-keychain-formation]')!;
  const fixture: LayoutFixture = {
    root,
    origin,
    heroCopy,
    formation,
    width: 390,
    leaderWidth: 32,
    leaderHeight: 60,
    followerWidth: 34,
    followerHeight: 62,
    formationInset: 0,
    reads: 0,
  };
  const pixels = (name: string): number => parseFloat(root.style.getPropertyValue(name)) || 0;
  const corridor = (): number => Math.max(20, pixels('--keychain-route-corridor'));
  const mobile = (): boolean => fixture.width < 768;
  const heroHeight = (): number => (mobile() ? 680 : Math.max(532, fixture.width * 0.52));
  const aboutHeight = 380;
  const courseHeight = 420;
  const aboutTop = (): number => heroHeight();
  const courseTop = (): number => aboutTop() + aboutHeight + pixels('--keychain-before-course');
  const contactTop = (): number => courseTop() + courseHeight + pixels('--keychain-before-contact');
  const formationHeight = (): number => Math.max(16, pixels('--keychain-arrival-height'));
  const contactHeight = (): number => 200 + formationHeight();
  const sceneRect = (): RouteRect =>
    mobile()
      ? {
          left: 20,
          top: 0,
          width: fixture.width - 40,
          height: Math.max(240, (fixture.width - 40) / 1.13),
        }
      : { left: fixture.width * 0.46, top: 0, width: fixture.width * 0.5, height: heroHeight() };
  const fullWidth = (top: number, height: number): RouteRect => ({
    left: 0,
    top,
    width: fixture.width,
    height,
  });
  const content = (top: number, height: number): RouteRect => ({
    left: corridor(),
    top,
    width: fixture.width - corridor() * 2,
    height,
  });

  function bind(element: HTMLElement, parent: HTMLElement | null, rect: () => RouteRect): void {
    const read = (key: keyof RouteRect): number => {
      fixture.reads++;
      return rect()[key];
    };
    Object.defineProperties(element, {
      offsetParent: { configurable: true, get: () => parent },
      offsetLeft: { configurable: true, get: () => read('left') },
      offsetTop: { configurable: true, get: () => read('top') },
      offsetWidth: { configurable: true, get: () => read('width') },
      offsetHeight: { configurable: true, get: () => read('height') },
    });
    vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => {
      fixture.reads++;
      const value = rect();
      // Child visual rectangles intentionally disagree with their stable offset positions.
      return {
        ...value,
        x: value.left + 100,
        y: value.top + (element === root ? -150 : 849),
        left: value.left + 100,
        top: value.top + (element === root ? -150 : 849),
        right: value.left + 100 + value.width,
        bottom: value.top + (element === root ? -150 : 849) + value.height,
        toJSON: () => ({}),
      };
    });
  }

  const hero = root.querySelector<HTMLElement>('#inicio')!;
  const about = root.querySelector<HTMLElement>('#sobre')!;
  const course = root.querySelector<HTMLElement>('#curso')!;
  const contact = root.querySelector<HTMLElement>('#contato')!;
  const scene = root.querySelector<HTMLElement>('[data-keychain-origin-surface]')!;
  const leader = root.querySelector<HTMLElement>('[data-keychain="ro-modas"]')!;
  bind(root, null, () => fullWidth(0, contactTop() + contactHeight()));
  bind(hero, root, () => fullWidth(0, heroHeight()));
  bind(about, root, () => fullWidth(aboutTop(), aboutHeight));
  bind(course, root, () => fullWidth(courseTop(), courseHeight));
  bind(contact, root, () => fullWidth(contactTop(), contactHeight()));
  bind(scene, hero, sceneRect);
  bind(leader, scene, () => ({
    left: sceneRect().width * 0.11 - fixture.leaderWidth / 2,
    top: sceneRect().height * 0.32 - fixture.leaderHeight / 2,
    width: fixture.leaderWidth,
    height: fixture.leaderHeight,
  }));
  bind(root.querySelector<HTMLElement>('[data-keychain="ro-cabelos"]')!, scene, () => ({
    left: sceneRect().width * 0.25 - fixture.followerWidth / 2,
    top: sceneRect().height * 0.32 - fixture.followerHeight / 2,
    width: fixture.followerWidth,
    height: fixture.followerHeight,
  }));
  bind(heroCopy, hero, () =>
    mobile()
      ? content(sceneRect().height + 18, heroHeight() - sceneRect().height - 38)
      : { left: corridor(), top: 140, width: fixture.width * 0.36 - corridor(), height: 250 },
  );
  bind(root.querySelector<HTMLElement>('[data-keychain-obstacle="about-copy"]')!, about, () =>
    content(70, 70),
  );
  bind(root.querySelector<HTMLElement>('[data-keychain-obstacle="about-products"]')!, about, () =>
    content(160, aboutHeight - 160 - (tightGaps ? 8 : 70)),
  );
  bind(root.querySelector<HTMLElement>('[data-keychain-obstacle="course-copy"]')!, course, () =>
    content(tightGaps ? 8 : 70, 60),
  );
  bind(root.querySelector<HTMLElement>('[data-keychain-obstacle="course-product"]')!, course, () =>
    content(140, 100),
  );
  bind(root.querySelector<HTMLElement>('[data-keychain-obstacle="course-action"]')!, course, () =>
    content(courseHeight - (tightGaps ? 54 : 120), 50),
  );
  bind(root.querySelector<HTMLElement>('[data-keychain-obstacle="contact-copy"]')!, contact, () =>
    content(tightGaps ? 4 : 70, 70),
  );
  bind(formation, contact, () => {
    const rect = content(180, formationHeight());
    return {
      ...rect,
      left: rect.left + fixture.formationInset,
      width: rect.width - fixture.formationInset * 2,
    };
  });
  return fixture;
}

describe('Keychain route layout lifecycle', () => {
  let fixture: LayoutFixture;
  let controller: KeychainRouteController | undefined;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  let notifyResize: () => void;
  let observer: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
  let fonts: EventTarget & { ready: Promise<void> };
  let resolveFonts: () => void;
  let descriptors: [object, string, PropertyDescriptor | undefined][];

  const replace = (target: object, key: string, value: unknown): void => {
    descriptors.push([target, key, Object.getOwnPropertyDescriptor(target, key)]);
    Object.defineProperty(target, key, { configurable: true, writable: true, value });
  };
  const flushFrame = (): void => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(0);
  };

  beforeEach(() => {
    controller = undefined;
    descriptors = [];
    frames = new Map();
    nextFrame = 0;
    notifyResize = () => {};
    replace(
      window,
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.set(++nextFrame, callback);
        return nextFrame;
      }),
    );
    replace(
      window,
      'cancelAnimationFrame',
      vi.fn((id: number) => frames.delete(id)),
    );
    replace(
      window,
      'ResizeObserver',
      class {
        readonly observe = vi.fn();
        readonly unobserve = vi.fn();
        readonly disconnect = vi.fn();
        constructor(callback: ResizeObserverCallback) {
          observer = this;
          notifyResize = () => callback([], this as unknown as ResizeObserver);
        }
      },
    );
    fonts = Object.assign(new EventTarget(), {
      ready: new Promise<void>((resolve) => {
        resolveFonts = resolve;
      }),
    });
    replace(document, 'fonts', fonts);
  });

  afterEach(async () => {
    controller?.destroy();
    resolveFonts();
    await Promise.resolve();
    fixture?.root.remove();
    vi.restoreAllMocks();
    for (const [target, key, descriptor] of descriptors.reverse()) {
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else Reflect.deleteProperty(target, key);
    }
  });

  it('waits for measurable layout and handles missing required nodes without throwing', () => {
    fixture = createLayout();
    fixture.width = 0;
    const changed = vi.fn();
    controller = setupKeychainRouteLayout(fixture.root, fixture.origin, {
      onGeometryChange: changed,
    });
    expect(controller.getSnapshot()).toEqual({ route: null, progress: 0, position: null });
    expect(changed).not.toHaveBeenCalled();

    fixture.width = 390;
    controller.refresh();
    expect(controller.getSnapshot().route?.valid).toBe(true);
    fixture.formation.remove();
    controller.refresh();
    expect(controller.getSnapshot().route).toBeNull();
    expect(controller.getSnapshot().position).toBeNull();
  });

  it('reserves actual crossing deficits and arrival height in two passes', () => {
    fixture = createLayout(true);
    controller = setupKeychainRouteLayout(fixture.root, fixture.origin);
    const route = controller.getSnapshot().route!;
    const config = animationConfig.keychains;
    const minimum =
      config.routeWidthMinPx * config.routeHeightRatio +
      2 * config.floatDistancePx +
      2 * config.routeClearancePx;

    expect(fixture.root.style.getPropertyValue('--keychain-before-course')).toBe(
      `${Math.ceil(minimum - 16)}px`,
    );
    expect(fixture.root.style.getPropertyValue('--keychain-before-contact')).toBe(
      `${Math.ceil(minimum - 8)}px`,
    );
    expect(fixture.formation.offsetHeight).toBeGreaterThanOrEqual(minimum);
    expect(route.issues).toEqual([]);
    expect(route.valid).toBe(true);
    expect(route.requiredSpacing.beforeCourse).toBe(0);
    expect(route.requiredSpacing.beforeContact).toBe(0);
  });

  it('keeps stable reserved spacing in place throughout an identical refresh', () => {
    fixture = createLayout(true);
    const changed = vi.fn();
    controller = setupKeychainRouteLayout(fixture.root, fixture.origin, {
      onGeometryChange: changed,
    });
    const before = fixture.root.style.cssText;
    const writeStyle = vi.spyOn(fixture.root.style, 'setProperty');

    controller.refresh();

    expect(writeStyle).not.toHaveBeenCalled();
    expect(fixture.root.style.cssText).toBe(before);
    expect(controller.getSnapshot().route?.valid).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('preserves progress across responsive refresh and samples cached geometry without measuring DOM', () => {
    fixture = createLayout();
    const changed = vi.fn();
    controller = setupKeychainRouteLayout(fixture.root, fixture.origin, {
      onGeometryChange: changed,
    });
    controller.setProgress(0.42);
    const previous = controller.getSnapshot();
    const reads = fixture.reads;
    for (const progress of [0.2, 0.8, Infinity, -Infinity, NaN, 0.42])
      controller.setProgress(progress);
    expect(fixture.reads).toBe(reads);
    expect(changed).toHaveBeenCalledTimes(1);

    fixture.width = 1024;
    controller.refresh();
    const next = controller.getSnapshot();
    expect(next.progress).toBe(0.42);
    expect(next.route?.valid).toBe(true);
    expect(next.position).toEqual(sampleKeychainRoute(next.route!, 0.42));
    expect(next.position).not.toEqual(previous.position);
    expect(changed).toHaveBeenCalledTimes(2);
    controller.refresh();
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('coalesces resize, observer, image and font invalidations without publishing unchanged routes', async () => {
    fixture = createLayout();
    const changed = vi.fn();
    controller = setupKeychainRouteLayout(fixture.root, fixture.origin, {
      onGeometryChange: changed,
    });
    expect(observer.observe).toHaveBeenCalledWith(fixture.heroCopy);
    resolveFonts();
    await Promise.resolve();
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('orientationchange'));
    fixture.root.querySelector('img')?.dispatchEvent(new Event('load'));
    fonts.dispatchEvent(new Event('loadingdone'));
    notifyResize();
    expect(frames.size).toBe(1);
    flushFrame();
    expect(changed).toHaveBeenCalledTimes(1);

    fixture.width = 768;
    window.dispatchEvent(new Event('resize'));
    notifyResize();
    fonts.dispatchEvent(new Event('loadingdone'));
    expect(frames.size).toBe(1);
    flushFrame();
    expect(changed).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot().route?.valid).toBe(true);
  });

  it('publishes changed conductor dimensions even when the route centre stays unchanged', () => {
    fixture = createLayout();
    const changed = vi.fn();
    controller = setupKeychainRouteLayout(fixture.root, fixture.origin, {
      onGeometryChange: changed,
    });
    const before = controller.getSnapshot();
    expect(before.geometry?.leader.width).toBe(32);
    expect(before.geometry?.leader.height).toBe(60);

    fixture.leaderWidth = 48;
    fixture.leaderHeight = 80;
    controller.refresh();

    const after = controller.getSnapshot();
    expect(after.route).toEqual(before.route);
    expect(after.geometry?.leader.width).toBe(48);
    expect(after.geometry?.leader.height).toBe(80);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('measures and observes every rendered member, excluding the unavailable asset', () => {
    fixture = createLayout();
    const changed = vi.fn();
    controller = setupKeychainRouteLayout(fixture.root, fixture.origin, {
      onGeometryChange: changed,
    });
    const follower = fixture.origin.querySelector<HTMLElement>('[data-keychain="ro-cabelos"]')!;
    const blocked = fixture.origin.querySelector<HTMLElement>('[data-keychain="e4kc-motorsport"]')!;
    const before = controller.getSnapshot();
    expect(before.geometry?.members.map((member) => member.id)).toEqual(['ro-modas', 'ro-cabelos']);
    expect(observer.observe).toHaveBeenCalledWith(follower);
    expect(observer.observe).not.toHaveBeenCalledWith(blocked);
    expect(before.geometry?.members[1].rect.width).toBe(34);

    // A follower-only resize must invalidate render caches even if the master route is unchanged.
    fixture.followerWidth = 46;
    fixture.followerHeight = 84;
    follower.style.transform = 'translate3d(500px, 900px, 0) scale(0.4)';
    controller.refresh();
    const after = controller.getSnapshot();
    expect(after.route).toEqual(before.route);
    expect(after.geometry?.members[1].rect.width).toBe(46);
    expect(after.geometry?.members[1].rect.height).toBe(84);
    expect(changed).toHaveBeenCalledTimes(2);
    const reads = fixture.reads;
    controller.setProgress(0.6);
    expect(fixture.reads).toBe(reads);
  });

  it('invalidates row geometry when its width changes without moving the central route', () => {
    fixture = createLayout();
    const changed = vi.fn();
    controller = setupKeychainRouteLayout(fixture.root, fixture.origin, {
      onGeometryChange: changed,
    });
    controller.setProgress(0.97);
    const before = controller.getSnapshot();
    expect(before.geometry?.formation.width).toBe(fixture.formation.offsetWidth);
    expect(observer.observe).toHaveBeenCalledWith(fixture.formation);

    fixture.formationInset = 24;
    controller.refresh();
    const after = controller.getSnapshot();
    expect(after.route).toEqual(before.route);
    expect(after.progress).toBe(0.97);
    expect(after.geometry!.formation.width).toBe(before.geometry!.formation.width - 48);
    expect(after.geometry!.formation.left).toBe(before.geometry!.formation.left + 24);
    expect(changed).toHaveBeenCalledTimes(2);
    controller.refresh();
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('cancels work and restores only owned CSS properties including their original priority', async () => {
    fixture = createLayout();
    fixture.root.style.setProperty('--keychain-route-corridor', '23px', 'important');
    fixture.root.style.setProperty('--keychain-before-course', '5px');
    fixture.root.style.setProperty('--unrelated-token', 'preserve');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const removeFonts = vi.spyOn(fonts, 'removeEventListener');
    controller = setupKeychainRouteLayout(fixture.root, fixture.origin);
    controller.setProgress(0.42);
    window.dispatchEvent(new Event('resize'));
    expect(frames.size).toBe(1);
    controller.destroy();
    controller.destroy();
    expect(frames.size).toBe(0);
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(removeWindow).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeFonts).toHaveBeenCalledWith('loadingdone', expect.any(Function));
    expect(fixture.root.style.getPropertyValue('--keychain-route-corridor')).toBe('23px');
    expect(fixture.root.style.getPropertyPriority('--keychain-route-corridor')).toBe('important');
    expect(fixture.root.style.getPropertyValue('--keychain-before-course')).toBe('5px');
    expect(fixture.root.style.getPropertyValue('--keychain-before-contact')).toBe('');
    expect(fixture.root.style.getPropertyValue('--unrelated-token')).toBe('preserve');

    resolveFonts();
    await Promise.resolve();
    window.dispatchEvent(new Event('resize'));
    notifyResize();
    controller.setProgress(0.9);
    expect(frames.size).toBe(0);
    expect(controller.getSnapshot().progress).toBe(0.42);
  });

  it('uses offset chains rather than transient transformed visual rectangles', () => {
    fixture = createLayout();
    controller = setupKeychainRouteLayout(fixture.root, fixture.origin);
    const route = controller.getSnapshot().route;
    fixture.heroCopy.style.transform = 'translateY(999px)';
    controller.refresh();
    expect(controller.getSnapshot().route).toEqual(route);
    expect(controller.getSnapshot().route?.valid).toBe(true);
    expect(fixture.heroCopy.getBoundingClientRect).not.toHaveBeenCalled();
    expect(fixture.root.getBoundingClientRect).toHaveBeenCalled();
  });
});
