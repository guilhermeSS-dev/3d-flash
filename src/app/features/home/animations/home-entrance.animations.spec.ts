import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setupHomeEntrances } from './home-entrance.animations';

describe('Secondary home entrances', () => {
  let root: HTMLElement;
  let cleanup: () => void;
  let reduced: boolean;
  let mediaDescriptor: PropertyDescriptor | undefined;
  let scrollDescriptor: PropertyDescriptor | undefined;
  let claims: Set<string>;
  let triggers: ScrollTrigger.Vars[];
  let tweens: gsap.core.Tween[];
  const claim = (id: string) => {
    if (claims.has(id)) return false;
    claims.add(id);
    return true;
  };
  beforeEach(() => {
    reduced = false;
    claims = new Set();
    triggers = [];
    tweens = [];
    cleanup = () => {};
    mediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    scrollDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollY');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: query.includes('no-preference') ? !reduced : reduced,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    vi.spyOn(gsap, 'registerPlugin').mockImplementation(() => {});
    vi.spyOn(ScrollTrigger, 'create').mockImplementation((vars) => {
      triggers.push(vars);
      return { kill: vi.fn() } as unknown as ScrollTrigger;
    });
    const fromTo = gsap.fromTo.bind(gsap);
    vi.spyOn(gsap, 'fromTo').mockImplementation((...args) => {
      const tween = fromTo(...args);
      tweens.push(tween);
      return tween;
    });
    root = document.createElement('div');
    root.innerHTML =
      '<section id="inicio"><img class="brand-logo" alt=""><div class="hero-copy"><button>Curso</button></div></section><section id="sobre"><div class="about-copy"><button>Sobre</button></div><div class="about-visual"></div></section><section id="curso"><div class="course-copy"></div><div class="course-product"></div><div class="course-action"></div></section><section id="contato"><div class="contact-copy"></div><div class="social-links"></div></section><footer id="rodape"><div class="footer-layout"></div></footer>';
    document.body.append(root);
    for (const section of root.querySelectorAll<HTMLElement>('section,footer'))
      vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({ top: 1200 } as DOMRect);
  });
  afterEach(() => {
    cleanup();
    gsap.ticker.sleep();
    root.remove();
    vi.restoreAllMocks();
    if (mediaDescriptor) Object.defineProperty(window, 'matchMedia', mediaDescriptor);
    else Reflect.deleteProperty(window, 'matchMedia');
    if (scrollDescriptor) Object.defineProperty(window, 'scrollY', scrollDescriptor);
    else Reflect.deleteProperty(window, 'scrollY');
  });
  const enter = (index: number, direction = 1) =>
    triggers[index].onEnter?.({ direction } as ScrollTrigger);
  it('opens in 0.8 seconds without concealing section content before its entry', () => {
    cleanup = setupHomeEntrances(root, claim);
    expect(tweens).toHaveLength(1);
    expect(tweens[0].duration()).toBe(0.8);
    expect(root.querySelector<HTMLElement>('.about-copy')!.style.opacity).toBe('');
    tweens[0].pause().progress(1);
    expect(root.querySelector<HTMLElement>('.hero-copy')!.style.opacity).toBe('1');
    expect(triggers).toHaveLength(4);
  });
  it('reveals each section once in 0.4 seconds and ignores repeated or reversed entries', () => {
    cleanup = setupHomeEntrances(root, claim);
    for (let index = 0; index < 4; index++) {
      enter(index);
      expect(tweens.at(-1)!.duration()).toBe(0.4);
      const count = tweens.length;
      enter(index);
      triggers[index].onEnterBack?.({ direction: -1 } as ScrollTrigger);
      expect(tweens).toHaveLength(count);
    }
    expect(claims.size).toBe(5);
  });
  it('finishes entrance motion when keyboard focus reaches its content', () => {
    cleanup = setupHomeEntrances(root, claim);
    enter(0);
    root.querySelector<HTMLButtonElement>('#sobre button')!.focus();
    expect(root.querySelector<HTMLElement>('.about-copy')!.style.opacity).toBe('1');
    expect(tweens[1].isActive()).toBe(false);
    root.querySelector<HTMLButtonElement>('#inicio button')!.focus();
    expect(root.querySelector<HTMLElement>('.hero-copy')!.style.opacity).toBe('1');
  });
  it('does not replay consumed entrances after a route remount', () => {
    cleanup = setupHomeEntrances(root, claim);
    enter(0);
    cleanup();
    const count = tweens.length;
    const priorTriggers = triggers.length;
    cleanup = setupHomeEntrances(root, claim);
    expect(tweens).toHaveLength(count);
    enter(priorTriggers);
    expect(tweens).toHaveLength(count);
  });
  it('leaves all content static and consumes entrances under reduced motion', () => {
    reduced = true;
    cleanup = setupHomeEntrances(root, claim);
    expect(tweens).toHaveLength(0);
    expect(triggers).toHaveLength(0);
    expect(claims.size).toBe(5);
    expect(root.querySelector<HTMLElement>('.hero-copy')!.style.opacity).toBe('');
  });
  it('keeps restored or already visible content visible and removes owned tweens on cleanup', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 500 });
    vi.mocked(root.querySelector<HTMLElement>('#sobre')!.getBoundingClientRect).mockReturnValue({
      top: 100,
    } as DOMRect);
    cleanup = setupHomeEntrances(root, claim);
    expect(tweens).toHaveLength(0);
    expect(claims.has('section:about')).toBe(true);
    expect(triggers).toHaveLength(3);
    enter(0);
    const own = [...tweens];
    cleanup();
    cleanup();
    const remaining = new Set(gsap.globalTimeline.getChildren(true, true, true));
    expect(own.some((tween) => remaining.has(tween))).toBe(false);
    expect(root.querySelector<HTMLElement>('.course-copy')!.style.opacity).toBe('');
  });
});
