import { gsap } from 'gsap';
import { animationConfig } from '../../../core/config/animation.config';
import { setupKeychainFloat } from './keychain-float.animations';

interface ControlledObserver {
  readonly notify: (visible: boolean) => void;
  readonly disconnect: ReturnType<typeof vi.fn>;
  readonly observe: ReturnType<typeof vi.fn>;
}

describe('Continuous keychain float', () => {
  let root: HTMLElement;
  let reduced: boolean;
  let visibility: DocumentVisibilityState;
  let observers: ControlledObserver[];
  let dispose: () => void;
  let mediaDescriptor: PropertyDescriptor | undefined;
  let observerDescriptor: PropertyDescriptor | undefined;
  let visibilityDescriptor: PropertyDescriptor | undefined;

  function addKeychain(id: string, render = true): HTMLElement {
    const outer = document.createElement('div');
    outer.dataset['keychain'] = id;
    outer.style.transform = 'translateX(21px)';
    outer.innerHTML = `<div data-keychain-float>${render ? '<img alt="" style="transform:scale(0.9)">' : ''}</div>`;
    root.append(outer);
    return outer.firstElementChild as HTMLElement;
  }

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
    reduced = false;
    visibility = 'visible';
    observers = [];
    dispose = () => {};
    mediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    observerDescriptor = Object.getOwnPropertyDescriptor(window, 'IntersectionObserver');
    visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: query.includes('no-preference') ? !reduced : reduced,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: class {
        readonly observe = vi.fn();
        readonly disconnect = vi.fn();
        constructor(callback: IntersectionObserverCallback) {
          observers.push({
            notify: (visible) =>
              callback(
                [
                  {
                    target: root,
                    isIntersecting: visible,
                    intersectionRatio: visible ? 1 : 0,
                    boundingClientRect: root.getBoundingClientRect(),
                    intersectionRect: root.getBoundingClientRect(),
                    rootBounds: null,
                    time: 0,
                  },
                ],
                this as unknown as IntersectionObserver,
              ),
            observe: this.observe,
            disconnect: this.disconnect,
          });
        }
      },
    });
  });

  afterEach(() => {
    dispose();
    gsap.ticker.sleep();
    root.remove();
    vi.restoreAllMocks();
    if (mediaDescriptor) Object.defineProperty(window, 'matchMedia', mediaDescriptor);
    else Reflect.deleteProperty(window, 'matchMedia');
    if (observerDescriptor)
      Object.defineProperty(window, 'IntersectionObserver', observerDescriptor);
    else Reflect.deleteProperty(window, 'IntersectionObserver');
    if (visibilityDescriptor)
      Object.defineProperty(document, 'visibilityState', visibilityDescriptor);
    else Reflect.deleteProperty(document, 'visibilityState');
  });

  it('animates visible inner wrappers independently while leaving trajectory and image transforms intact', () => {
    const first = addKeychain('ro-modas');
    const second = addKeychain('leca-tintas');
    const reserved = addKeychain('e4kc-motorsport', false);
    dispose = setupKeychainFloat(root);
    const firstTween = gsap.getTweensOf(first)[0]!;
    const secondTween = gsap.getTweensOf(second)[0]!;

    expect(firstTween.repeat()).toBe(-1);
    expect(firstTween.yoyo()).toBe(true);
    expect(firstTween.duration()).toBeGreaterThanOrEqual(
      animationConfig.keychains.floatHalfCycleMinSeconds,
    );
    expect(firstTween.duration()).toBeLessThanOrEqual(
      animationConfig.keychains.floatHalfCycleMaxSeconds,
    );
    expect(firstTween.duration()).not.toBe(secondTween.duration());
    expect(firstTween.totalTime()).not.toBe(secondTween.totalTime());
    expect(gsap.getTweensOf(reserved)).toHaveLength(0);

    const displacements: number[] = [];
    firstTween.pause().totalTime(0, true);
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      firstTween.progress(progress);
      const y = Number(gsap.getProperty(first, 'y'));
      displacements.push(y);
      expect(Math.abs(y)).toBeLessThanOrEqual(animationConfig.keychains.floatDistancePx);
      expect(Math.abs(Number(gsap.getProperty(first, 'rotation')))).toBeLessThanOrEqual(
        animationConfig.keychains.floatRotationDegrees,
      );
    }
    expect(Math.min(...displacements)).toBeLessThan(0);
    expect(Math.max(...displacements)).toBeGreaterThan(0);
    expect(first.parentElement?.style.transform).toBe('translateX(21px)');
    expect(first.querySelector('img')?.style.transform).toBe('scale(0.9)');
  });

  it('keeps the timing and phase of an asset stable if another asset is removed', () => {
    addKeychain('ro-cabelos');
    const target = addKeychain('v-motos-racing');
    dispose = setupKeychainFloat(root);
    const initial = gsap.getTweensOf(target)[0]!;
    const duration = initial.duration();
    const phase = initial.totalTime();
    dispose();
    root.firstElementChild?.remove();

    dispose = setupKeychainFloat(root);
    const remounted = gsap.getTweensOf(target)[0]!;
    expect(remounted.duration()).toBe(duration);
    expect(remounted.totalTime()).toBeCloseTo(phase, 5);
  });

  it('pauses outside the visible area and in a background document without resetting the cycle', () => {
    const inner = addKeychain('ro-modas');
    dispose = setupKeychainFloat(root);
    const tween = gsap.getTweensOf(inner)[0]!;
    tween.totalTime(1.25, true);
    observers[0]!.notify(false);
    expect(tween.paused()).toBe(true);
    expect(tween.totalTime()).toBe(1.25);
    observers[0]!.notify(true);
    expect(tween.paused()).toBe(false);
    expect(tween.totalTime()).toBe(1.25);

    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(tween.paused()).toBe(true);
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(tween.paused()).toBe(false);
    expect(tween.totalTime()).toBe(1.25);
  });

  it('starts static with reduced motion and removes active floats when that preference changes', () => {
    const inner = addKeychain('ro-modas');
    reduced = true;
    dispose = setupKeychainFloat(root);
    expect(gsap.getTweensOf(inner)).toHaveLength(0);
    expect(inner.style.transform).toBe('');

    reduced = false;
    gsap.matchMediaRefresh();
    expect(gsap.getTweensOf(inner)).toHaveLength(1);
    reduced = true;
    gsap.matchMediaRefresh();
    expect(gsap.getTweensOf(inner)).toHaveLength(0);
    expect(inner.style.transform).toBe('');
    expect(observers[0]?.disconnect).toHaveBeenCalled();
  });

  it('reverts only its own transforms and disconnects visibility resources on repeated cleanup', () => {
    const inner = addKeychain('ro-modas');
    const removeListener = vi.spyOn(document, 'removeEventListener');
    dispose = setupKeychainFloat(root);
    expect(inner.style.transform).not.toBe('');
    dispose();
    dispose();

    expect(gsap.getTweensOf(inner)).toHaveLength(0);
    expect(inner.style.transform).toBe('');
    expect(inner.parentElement?.style.transform).toBe('translateX(21px)');
    expect(inner.querySelector('img')?.style.transform).toBe('scale(0.9)');
    expect(observers[0]?.disconnect).toHaveBeenCalled();
    expect(removeListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
