import { gsap } from 'gsap';
import { setupElectricTrail, type ElectricTrailController } from './electric-trail.animations';
import { type KeychainRouteGeometry } from './keychain-route-layout';
import { type KeychainMotionFrame } from './keychain-motion.model';

describe('Bounded electric SVG trail', () => {
  let root: HTMLElement;
  let svg: SVGSVGElement;
  let trail: ElectricTrailController;
  let time: number;
  let reduced: boolean;
  let forcedColors: boolean;
  let originalMedia: typeof window.matchMedia;
  let fades: gsap.core.Tween[];
  const geometry: KeychainRouteGeometry = {
    surface: { width: 390, height: 2400 },
    obstacles: [{ left: 50, top: 400, width: 280, height: 200 }],
    leader: { left: 10, top: 10, width: 24, height: 48 },
    members: [],
    formation: { left: 40, top: 2200, width: 310, height: 100 },
    footprint: { width: 24, height: 64 },
    documentTop: 0,
  };
  const frame = (
    progress: number,
    y: number,
    reason: 'motion' | 'reset' = 'motion',
  ): KeychainMotionFrame => ({
    progress,
    reason,
    members: [{ id: 'a', x: 20, y, width: 24, height: 48 }],
  });
  const active = () =>
    Array.from(svg.querySelectorAll('[data-electric-slot]')).filter(
      (node) => Number(node.getAttribute('opacity')) > 0,
    );
  beforeEach(() => {
    time = 0;
    reduced = false;
    forcedColors = false;
    fades = [];
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn((query: string) => ({
      matches: query.includes('no-preference')
        ? !reduced
        : query.includes('reduced-motion: reduce')
          ? reduced
          : query.includes('forced-colors') && forcedColors,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    vi.spyOn(window.performance, 'now').mockImplementation(() => time);
    const fromTo = gsap.fromTo.bind(gsap);
    vi.spyOn(gsap, 'fromTo').mockImplementation((...args) => {
      const tween = fromTo(...args);
      fades.push(tween);
      return tween;
    });
    root = document.createElement('div');
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    root.append(svg);
    document.body.append(root);
    trail = setupElectricTrail(svg, root);
    trail.refresh(geometry);
    trail.update(frame(0, 100, 'reset'));
  });
  afterEach(() => {
    trail.destroy();
    root.remove();
    gsap.ticker.sleep();
    vi.restoreAllMocks();
    window.matchMedia = originalMedia;
  });
  const scroll = () => window.dispatchEvent(new Event('scroll'));
  it('emits angular branched discharges in both movement directions only during native scroll', () => {
    trail.update(frame(0.1, 140));
    expect(active()).toHaveLength(0);
    time = 60;
    scroll();
    trail.update(frame(0.2, 180));
    expect(active()).toHaveLength(1);
    const down = svg.querySelector('[data-electric-core]')!.getAttribute('d')!;
    expect(down).toContain('L');
    expect(down.match(/M/g)!.length).toBeGreaterThan(1);
    time = 120;
    scroll();
    trail.update(frame(0.1, 130));
    expect(active()).toHaveLength(2);
    const up = svg.querySelectorAll('[data-electric-core]')[1].getAttribute('d');
    expect(up).not.toBe(down);
  });
  it('ignores unchanged progress, reset and layout refresh', () => {
    scroll();
    trail.update(frame(0, 140));
    expect(active()).toHaveLength(0);
    trail.update(frame(0.4, 800, 'reset'));
    expect(active()).toHaveLength(0);
    trail.refresh(geometry);
    expect(active()).toHaveLength(0);
    trail.update(frame(0.5, 900));
    expect(active()).toHaveLength(0);
  });
  it('stops emitting after scroll ends while existing flashes finish their fade', () => {
    scroll();
    trail.update(frame(0.1, 140));
    expect(active()).toHaveLength(1);
    time = 160;
    trail.update(frame(0.2, 190));
    expect(active()).toHaveLength(1);
    fades.forEach((fade) => fade.progress(1));
    expect(active()).toHaveLength(0);
    time = 200;
    scroll();
    trail.update(frame(0.3, 240));
    window.dispatchEvent(new Event('scrollend'));
    time = 260;
    trail.update(frame(0.4, 290));
    expect(active()).toHaveLength(1);
  });
  it('reuses eight slots and never creates DOM nodes on motion frames', () => {
    const slots = Array.from(svg.querySelectorAll('[data-electric-slot]'));
    const create = vi.spyOn(document, 'createElementNS');
    const bounds = vi.spyOn(root, 'getBoundingClientRect');
    const computed = vi.spyOn(window, 'getComputedStyle');
    for (let index = 1; index <= 30; index++) {
      time += 60;
      scroll();
      trail.update(frame(index / 31, 100 + index * 20));
    }
    expect(svg.querySelectorAll('[data-electric-slot]')).toHaveLength(8);
    expect(Array.from(svg.querySelectorAll('[data-electric-slot]'))).toEqual(slots);
    expect(create).not.toHaveBeenCalled();
    expect(bounds).not.toHaveBeenCalled();
    expect(computed).not.toHaveBeenCalled();
  });
  it('masks protected rectangles outside the halo and assigns unique filter IDs', () => {
    expect(svg.getAttribute('viewBox')).toBe('0 0 390 2400');
    const obstacle = svg.querySelector('[data-electric-obstacle]')!;
    expect(obstacle.getAttribute('x')).toBe('42');
    expect(obstacle.getAttribute('width')).toBe('296');
    const halo = svg.querySelector('[data-electric-halo]')!;
    expect(halo.closest('g[mask]')).not.toBeNull();
    const other = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    root.append(other);
    const second = setupElectricTrail(other, root);
    try {
      expect(other.querySelector('filter')!.id).not.toBe(svg.querySelector('filter')!.id);
    } finally {
      second.destroy();
    }
  });
  it('clears on hidden documents and invalid geometry without leaving stale paths visible', () => {
    scroll();
    trail.update(frame(0.1, 140));
    expect(active()).toHaveLength(1);
    trail.refresh(undefined);
    expect(active()).toHaveLength(0);
    trail.refresh(geometry);
    trail.update(frame(0.2, 200, 'reset'));
    time = 60;
    scroll();
    trail.update(frame(0.3, 240));
    expect(active()).toHaveLength(1);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(active()).toHaveLength(0);
  });
  it('removes effects for reduced motion and restores an empty pool when re-enabled', async () => {
    reduced = true;
    await new Promise((resolve) => setTimeout(resolve, 5));
    gsap.matchMediaRefresh();
    expect(svg.children).toHaveLength(0);
    scroll();
    trail.update(frame(0.2, 180));
    expect(svg.children).toHaveLength(0);
    reduced = false;
    await new Promise((resolve) => setTimeout(resolve, 5));
    gsap.matchMediaRefresh();
    expect(svg.querySelectorAll('[data-electric-slot]')).toHaveLength(8);
    expect(active()).toHaveLength(0);
  });
  it('accumulates slow movement until a discharge is warranted without animating idle objects', () => {
    for (let index = 1; index <= 2; index++) {
      time += 60;
      scroll();
      trail.update(frame(index / 100, 100 + index));
      expect(active()).toHaveLength(0);
    }
    time += 60;
    scroll();
    trail.update(frame(0.03, 103));
    expect(active()).toHaveLength(1);
    fades.forEach((fade) => fade.progress(1));
    time += 60;
    scroll();
    trail.update(frame(0.04, 103));
    expect(active()).toHaveLength(0);
  });

  it('limits mask raster bounds to active flashes and releases the region after fading', () => {
    const mask = svg.querySelector('mask')!;
    expect(Number(mask.getAttribute('height'))).toBe(0);
    scroll();
    trail.update(frame(0.1, 140));
    const area = () => Number(mask.getAttribute('width')) * Number(mask.getAttribute('height'));
    expect(area()).toBeGreaterThan(0);
    expect(area()).toBeLessThan((geometry.surface.width * geometry.surface.height) / 10);
    const x = Number(mask.getAttribute('x'));
    const y = Number(mask.getAttribute('y'));
    const right = x + Number(mask.getAttribute('width'));
    const bottom = y + Number(mask.getAttribute('height'));
    const numbers = svg
      .querySelector('[data-electric-core]')!
      .getAttribute('d')!
      .match(/-?\d+(?:\.\d+)?/g)!
      .map(Number);
    for (let index = 0; index < numbers.length; index += 2) {
      expect(numbers[index]).toBeGreaterThan(x);
      expect(numbers[index]).toBeLessThan(right);
      expect(numbers[index + 1]).toBeGreaterThan(y);
      expect(numbers[index + 1]).toBeLessThan(bottom);
    }
    time = 60;
    scroll();
    trail.update(frame(0.8, 1800));
    expect(Number(mask.getAttribute('height'))).toBeLessThan(geometry.surface.height);
    fades[0].progress(1);
    expect(Number(mask.getAttribute('y'))).toBeGreaterThan(1600);
    fades.forEach((fade) => fade.progress(1));
    expect(area()).toBe(0);
    expect(svg.querySelectorAll('[data-electric-slot]')).toHaveLength(8);
  });

  it('rebuilds the protection mask on resize and waits for fresh telemetry before emitting', () => {
    scroll();
    trail.update(frame(0.1, 140));
    trail.refresh({
      ...geometry,
      surface: { width: 768, height: 3000 },
      obstacles: [{ left: 80, top: 500, width: 600, height: 400 }],
    });
    expect(active()).toHaveLength(0);
    expect(svg.getAttribute('viewBox')).toBe('0 0 768 3000');
    expect(svg.querySelector('[data-electric-obstacle]')!.getAttribute('width')).toBe('616');
    time = 60;
    scroll();
    trail.update(frame(0.2, 900));
    expect(active()).toHaveLength(0);
    time = 120;
    scroll();
    trail.update(frame(0.3, 940));
    expect(active()).toHaveLength(1);
  });

  it('disables and releases the SVG pool for forced colors', async () => {
    scroll();
    trail.update(frame(0.1, 140));
    forcedColors = true;
    await new Promise((resolve) => setTimeout(resolve, 5));
    gsap.matchMediaRefresh();
    expect(svg.children).toHaveLength(0);
    forcedColors = false;
    await new Promise((resolve) => setTimeout(resolve, 5));
    gsap.matchMediaRefresh();
    expect(svg.querySelectorAll('[data-electric-slot]')).toHaveLength(8);
    expect(active()).toHaveLength(0);
  });

  it('pauses offscreen work and starts from a fresh position when visible again', () => {
    trail.destroy();
    const descriptor = Object.getOwnPropertyDescriptor(window, 'IntersectionObserver');
    let notify: IntersectionObserverCallback = () => {};
    const disconnect = vi.fn();
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: class {
        constructor(callback: IntersectionObserverCallback) {
          notify = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    });
    try {
      trail = setupElectricTrail(svg, root);
      trail.refresh(geometry);
      trail.update(frame(0, 100, 'reset'));
      scroll();
      trail.update(frame(0.1, 140));
      expect(active()).toHaveLength(1);
      const intersection = (isIntersecting: boolean) =>
        notify(
          [{ target: root, isIntersecting } as unknown as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      intersection(false);
      expect(active()).toHaveLength(0);
      time = 60;
      scroll();
      trail.update(frame(0.2, 1000));
      expect(active()).toHaveLength(0);
      intersection(true);
      time = 120;
      scroll();
      trail.update(frame(0.3, 1040));
      expect(active()).toHaveLength(1);
      trail.destroy();
      expect(disconnect).toHaveBeenCalledTimes(1);
    } finally {
      if (descriptor) Object.defineProperty(window, 'IntersectionObserver', descriptor);
      else Reflect.deleteProperty(window, 'IntersectionObserver');
    }
  });

  it('repeated mounts leave no old SVG nodes or fade tweens on the global timeline', () => {
    trail.destroy();
    for (let cycle = 0; cycle < 4; cycle++) {
      trail = setupElectricTrail(svg, root);
      trail.refresh(geometry);
      trail.update(frame(0, 100, 'reset'));
      scroll();
      trail.update(frame(0.1, 140));
      expect(svg.querySelectorAll('[data-electric-slot]')).toHaveLength(8);
      trail.destroy();
      expect(svg.children).toHaveLength(0);
      const globalTweens = new Set(gsap.globalTimeline.getChildren(true, true, false));
      expect(fades.some((fade) => globalTweens.has(fade))).toBe(false);
    }
  });

  it('destroys only owned resources and accepts repeated cleanup', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    trail.destroy();
    trail.destroy();
    expect(svg.children).toHaveLength(0);
    expect(svg.hasAttribute('viewBox')).toBe(false);
    expect(remove.mock.calls.some(([name]) => name === 'scroll')).toBe(true);
    trail.update(frame(0.8, 900));
    trail.refresh(geometry);
    expect(svg.children).toHaveLength(0);
  });
});
