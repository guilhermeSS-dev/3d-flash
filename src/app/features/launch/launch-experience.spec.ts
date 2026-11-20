import { LaunchClock } from './launch-clock';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { launchConfig, type LaunchConfig } from '../../core/config/launch.config';
import { LaunchExperience } from './launch-experience';
import { LAUNCH_CONFIG, LaunchSessionService } from './launch-session.service';
import { RunnerEngine } from './runner-engine';

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
describe('Launch experience integration', () => {
  let fixture: ComponentFixture<LaunchExperience>;
  let root: HTMLElement;
  let wall: number;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  let config: LaunchConfig;
  let context: CanvasRenderingContext2D;
  let hidden: boolean;
  let rafOriginal: typeof window.requestAnimationFrame;
  let cancelOriginal: typeof window.cancelAnimationFrame;
  let visibilityDescriptor: PropertyDescriptor | undefined;
  beforeEach(() => {
    wall = Date.parse('2030-12-01T22:59:00Z');
    frames = new Map();
    nextFrame = 0;
    hidden = false;
    vi.spyOn(Date, 'now').mockImplementation(() => wall);
    rafOriginal = window.requestAnimationFrame;
    cancelOriginal = window.cancelAnimationFrame;
    window.requestAnimationFrame = vi.fn((callback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    window.cancelAnimationFrame = vi.fn((id) => {
      frames.delete(id);
    });
    visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private source = '';
        get naturalWidth() {
          const asset = Object.values(config.assets).find((asset) => asset.src === this.source)!;
          return asset.frameWidth * asset.frameDurationsMs.length;
        }
        get naturalHeight() {
          return Object.values(config.assets).find((asset) => asset.src === this.source)!
            .frameHeight;
        }
        set src(value: string) {
          this.source = value;
          if (value) queueMicrotask(() => this.onload?.());
        }
      },
    );
    context = {
      setTransform: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 390,
      height: 182,
    } as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 390,
      height: 800,
    } as DOMRect);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
    );
    localStorage.clear();
    config = {
      ...launchConfig,
      enabled: true,
      countdownRefreshMs: 10,
      reveal: { ...launchConfig.reveal, anticipationMs: 0, durationMs: 20 },
      rendering: { ...launchConfig.rendering, removeConnectedBackground: false },
    };
  });
  afterEach(() => {
    fixture?.destroy();
    frames.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.requestAnimationFrame = rafOriginal;
    window.cancelAnimationFrame = cancelOriginal;
    if (visibilityDescriptor) Object.defineProperty(document, 'hidden', visibilityDescriptor);
    else Reflect.deleteProperty(document, 'hidden');
    localStorage.clear();
  });
  async function mount() {
    TestBed.configureTestingModule({
      imports: [LaunchExperience],
      providers: [{ provide: LAUNCH_CONFIG, useValue: config }],
    });
    fixture = TestBed.createComponent(LaunchExperience);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  }
  const engine = () => (fixture.componentInstance as unknown as { engine: RunnerEngine }).engine;
  const flush = (time: number) => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(time));
    fixture.detectChanges();
  };
  const start = () => {
    root.querySelector<HTMLCanvasElement>('canvas')!.focus();
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Space', cancelable: true, bubbles: true }),
    );
    fixture.detectChanges();
  };
  const collect = () => {
    const c = config.game;
    Object.assign(engine().objects[0], {
      active: true,
      kind: 'bolt',
      x: c.playerX + 12,
      y: c.ground - c.boltHeight,
      width: c.boltWidth,
      height: c.boltHeight,
    });
  };
  it('loads supplied sprites but waits for the first jump gesture', async () => {
    await mount();
    expect(root.querySelector('.start-hint')?.textContent).toContain('USE ESPACO');
    expect(root.querySelector('[data-start]')).toBeNull();
    expect(engine().running).toBe(false);
    start();
    expect(engine().running).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('canvas'));
    expect(frames.size).toBeGreaterThan(0);
  });
  it('accepts space, up and primary touch, rejects repeats and infinite jumps', async () => {
    await mount();
    start();
    for (const code of ['Space', 'ArrowUp']) {
      engine().y = config.game.ground - config.game.playerHeight;
      engine().vy = 0;
      const event = new KeyboardEvent('keydown', { code, cancelable: true, bubbles: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(engine().vy).toBe(-config.game.jumpImpulse);
    }
    const before = engine().vy;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', repeat: true }));
    expect(engine().vy).toBe(before);
    engine().y = config.game.ground - config.game.playerHeight;
    engine().vy = 0;
    const touch = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 });
    Object.defineProperty(touch, 'isPrimary', { value: true });
    root.querySelector('canvas')!.dispatchEvent(touch);
    expect(touch.defaultPrevented).toBe(true);
    expect(engine().vy).toBeLessThan(0);
  });
  function reachReward() {
    for (let time = 40; time < 3000 && !root.querySelector('app-vip-reward'); time += 20)
      flush(time);
  }
  it('flies toward the character, pauses on contact, and persists access without replaying the surprise', async () => {
    config = {
      ...config,
      VIP_REWARD_THRESHOLD: 1,
      VIP_WHATSAPP_URL: 'https://chat.whatsapp.com/test-only-fixture',
    };
    await mount();
    start();
    flush(0);
    collect();
    flush(20);
    expect(engine().score).toBe(1);
    expect(root.querySelector('app-vip-reward')).toBeNull();
    expect(JSON.parse(localStorage.getItem(config.storageKey)!).announced).toBe(false);
    reachReward();
    const modal = root.querySelector('app-vip-reward')!;
    expect(modal.textContent).toContain('Você ganhou acesso ao nosso grupo VIP!');
    expect(modal.textContent).toContain('Você coletou 1 raio');
    expect((root.querySelector('.runner-viewport') as HTMLElement).inert).toBe(true);
    expect(frames.size).toBe(0);
    const distance = engine().distance;
    const draws = vi.mocked(context.drawImage).mock.calls.length;
    flush(9000);
    expect(vi.mocked(context.drawImage).mock.calls.length).toBe(draws);
    expect(engine().distance).toBe(distance);
    expect(document.activeElement).toBe(modal.querySelector('.reward-card'));
    expect(root.querySelector('.vip-access')).toBeNull();
    const link = modal.querySelector<HTMLAnchorElement>('.reward-link')!;
    expect(link.href).toBe(config.VIP_WHATSAPP_URL);
    expect(link.rel).toContain('noopener');
    modal.querySelector<HTMLButtonElement>('.reward-close')!.click();
    fixture.detectChanges();
    expect(root.querySelector('app-vip-reward')).toBeNull();
    expect(root.querySelector('.vip-access')).not.toBeNull();
    flush(10000);
    expect(engine().distance).toBe(distance);
    flush(10020);
    expect(engine().distance).toBeGreaterThan(distance);
    expect(JSON.parse(localStorage.getItem(config.storageKey)!).announced).toBe(true);
    fixture.destroy();
    fixture = TestBed.createComponent(LaunchExperience);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    root = fixture.nativeElement;
    expect(root.querySelector('.vip-footer a')).not.toBeNull();
    expect(root.querySelector('app-vip-reward')).toBeNull();
    expect(root.textContent).not.toContain('Você ganhou acesso ao nosso grupo VIP!');
  });
  it('stops on collision and requires an explicit restart that clears only the current run', async () => {
    await mount();
    start();
    flush(0);
    collect();
    flush(20);
    const c = config.game;
    Object.assign(engine().objects[1], {
      active: true,
      kind: 'obstacle',
      x: c.playerX,
      y: c.ground - c.obstacleHeight,
      width: c.obstacleWidth,
      height: c.obstacleHeight,
    });
    flush(40);
    expect(root.textContent).toContain('GAME OVER');
    expect(engine().running).toBe(false);
    expect(root.querySelector('[data-start]')).toBeNull();
    expect(root.querySelector('.start-hint')?.textContent).toContain('PARA JOGAR NOVAMENTE');
    start();
    expect(engine().score).toBe(0);
    expect(root.querySelectorAll('.metric strong')[1].textContent).toBe('01');
  });
  it('pauses on hidden tabs and resumes without simulating the missing interval', async () => {
    await mount();
    start();
    flush(0);
    flush(20);
    const distance = engine().distance;
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(0);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    flush(60000);
    expect(engine().distance).toBe(distance);
  });
  it('reveals the mounted landing at zero through pixel blocks and releases resources', async () => {
    await mount();
    start();
    flush(0);
    wall = Date.parse(config.launchAt);
    await new Promise((resolve) => setTimeout(resolve, 25));
    fixture.detectChanges();
    expect(engine().running).toBe(false);
    expect(root.textContent).toContain('CHEGOU A HORA!');
    flush(100);
    flush(110);
    expect(root.querySelector('[data-pixel-path]')!.getAttribute('d')).not.toBe(
      'M0 0H10000V10000H0Z',
    );
    flush(130);
    expect(TestBed.inject(LaunchSessionService).active()).toBe(false);
    expect(root.querySelector('.launch-shell')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
  it('does not display the overlay or start timers for visitors arriving after launch', async () => {
    wall = Date.parse(config.launchAt) + 1;
    await mount();
    expect(root.querySelector('.launch-shell')).toBeNull();
    expect(frames.size).toBe(0);
  });
  it('keeps focus in the waiting experience and releases its loop when destroyed', async () => {
    await mount();
    start();
    root.querySelector<HTMLCanvasElement>('canvas')!.focus();
    const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
    window.dispatchEvent(backward);
    expect(backward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('.volume'));
    fixture.destroy();
    expect(frames.size).toBe(0);
    expect(document.body.style.overflow).not.toBe('hidden');
  });
  const point = (target: Element, type = 'touch') => {
    const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 });
    Object.defineProperty(event, 'pointerType', { value: type });
    Object.defineProperty(event, 'isPrimary', { value: true });
    target.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };
  it('keeps the counter and permanent VIP access outside the square game', async () => {
    await mount();
    const stage = root.querySelector('app-runner-stage')!;
    expect(root.querySelector('.countdown')?.closest('app-runner-stage')).toBeNull();
    for (const selector of ['canvas', '.hud', '.volume', '.start-hint'])
      expect(stage.querySelector(selector)).not.toBeNull();
    expect(root.querySelector('.hud')!.parentElement!.hasAttribute('data-runner-viewport')).toBe(
      true,
    );
    expect(root.querySelectorAll('.launch-content > *')).toHaveLength(3);
    expect(stage.querySelector('.vip')).toBeNull();
    expect(stage.querySelector('.vip-footer')).toBeNull();
    expect(root.querySelector('.vip-footer')?.previousElementSibling).toBe(stage);
    expect(root.textContent).not.toContain('GRUPO VIP - LINK EM BREVE');
    expect(root.querySelector('.launch-intro .launch-brand')).not.toBeNull();
    expect(stage.querySelector('img')).toBeNull();
  });
  it('uses touch instructions for coarse devices even when an existing record is present', async () => {
    vi.mocked(window.matchMedia).mockImplementation(
      (query) =>
        ({
          matches: query.includes('pointer: coarse'),
          addListener: vi.fn(),
          removeListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    localStorage.setItem(
      config.storageKey,
      JSON.stringify({ best: 11, unlocked: true, announced: true }),
    );
    await mount();
    expect(root.querySelector('.start-hint')?.textContent).toContain('TOQUE NA TELA');
    expect(root.querySelector('.start-hint')?.textContent).not.toContain('ESPACO');
    expect(engine().score).toBe(0);
    expect(root.querySelectorAll('.metric strong')[1].textContent).toBe('11');
  });
  it('starts and jumps from a touch on the counter, and does not create extra loops for further taps', async () => {
    await mount();
    const event = point(root.querySelector('.countdown')!);
    expect(event.defaultPrevented).toBe(true);
    expect(engine().running).toBe(true);
    expect(engine().vy).toBe(-config.game.jumpImpulse);
    const framesBefore = vi.mocked(window.requestAnimationFrame).mock.calls.length;
    const velocity = engine().vy;
    point(root.querySelector('.launch-shell')!);
    expect(engine().vy).toBe(velocity);
    expect(vi.mocked(window.requestAnimationFrame)).toHaveBeenCalledTimes(framesBefore);
    expect(root.querySelector('.start-hint')).toBeNull();
  });
  it('keeps volume and VIP interactions independent from jump or restart', async () => {
    config = { ...config, VIP_WHATSAPP_URL: 'https://chat.whatsapp.com/test-only-fixture' };
    localStorage.setItem(
      config.storageKey,
      JSON.stringify({ best: 11, unlocked: true, announced: true }),
    );
    await mount();
    const volume = root.querySelector<HTMLButtonElement>('.volume')!;
    expect(point(volume).defaultPrevented).toBe(false);
    volume.click();
    fixture.detectChanges();
    expect(document.activeElement).toBe(root.querySelector('canvas'));
    expect(engine().running).toBe(false);
    expect(volume.getAttribute('aria-pressed')).toBe('true');
    expect(volume.querySelector('.muted-mark')).not.toBeNull();
    const invite = root.querySelector('.vip-footer a')!;
    expect(point(invite).defaultPrevented).toBe(false);
    expect(engine().running).toBe(false);
    expect(invite.textContent?.trim()).toBe('Acesso ao grupo');
    expect(invite.closest('app-runner-stage')).toBeNull();
    volume.focus();
    const event = new KeyboardEvent('keydown', { code: 'Space', cancelable: true, bubbles: true });
    volume.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(engine().running).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('canvas'));
  });
  it('restarts Game Over by a fresh touch anywhere without requiring a restart button', async () => {
    await mount();
    start();
    flush(0);
    const c = config.game;
    Object.assign(engine().objects[0], {
      active: true,
      kind: 'obstacle',
      x: c.playerX,
      y: c.ground - c.obstacleHeight,
      width: c.obstacleWidth,
      height: c.obstacleHeight,
    });
    flush(20);
    expect(engine().running).toBe(false);
    expect(root.querySelector('.start-hint')?.textContent).toContain('NOVAMENTE');
    point(root.querySelector('.launch-shell')!);
    expect(engine().running).toBe(true);
    expect(engine().score).toBe(0);
    expect(engine().vy).toBe(-c.jumpImpulse);
    expect(root.querySelector('.start-hint')).toBeNull();
  });
  it('preserves world proportions while fitting the canvas into its allocated stage', async () => {
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue({
      width: 900,
      height: 180,
    } as DOMRect);
    await mount();
    start();
    flush(0);
    const call = vi.mocked(context.setTransform).mock.calls.at(-1)! as unknown as number[];
    expect(call[0]).toBe(call[3]);
    expect(call[0] * engine().width).toBeLessThanOrEqual(900);
    expect(call[3] * config.game.height).toBeLessThanOrEqual(180);
  });
  it('uses Tab as a fresh jump gesture while retaining Shift-Tab control navigation', async () => {
    await mount();
    const tab = new KeyboardEvent('keydown', {
      code: 'Tab',
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    root.querySelector('canvas')!.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(engine().running).toBe(true);
    expect(engine().vy).toBe(-config.game.jumpImpulse);
    const held = new KeyboardEvent('keydown', {
      code: 'Tab',
      key: 'Tab',
      repeat: true,
      bubbles: true,
      cancelable: true,
    });
    root.querySelector('canvas')!.dispatchEvent(held);
    expect(engine().vy).toBe(-config.game.jumpImpulse);
    const previous = new KeyboardEvent('keydown', {
      code: 'Tab',
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    root.querySelector('canvas')!.dispatchEvent(previous);
    expect(document.activeElement).toBe(root.querySelector('.volume'));
  });
  it('keeps the waiting layer at zero until the clock synchronization completes', async () => {
    await mount();
    vi.spyOn(TestBed.inject(LaunchClock), 'sync').mockResolvedValue(false);
    wall = Date.parse(config.launchAt);
    await new Promise((resolve) => setTimeout(resolve, 30));
    fixture.detectChanges();
    expect(TestBed.inject(LaunchSessionService).active()).toBe(true);
    expect(root.textContent).not.toContain('CHEGOU A HORA!');
  });
  it('traps popup keyboard input, closes with Escape and never translates it into a jump', async () => {
    config = { ...config, VIP_REWARD_THRESHOLD: 1 };
    await mount();
    start();
    flush(0);
    collect();
    flush(20);
    reachReward();
    const close = root.querySelector<HTMLButtonElement>('.reward-close')!;
    const velocity = engine().vy;
    close.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(close);
    expect(engine().vy).toBe(velocity);
    close.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(root.querySelector('app-vip-reward')).toBeNull();
    expect(engine().vy).toBe(velocity);
    expect(frames.size).toBe(1);
  });
  it('does not replay the arrival for an existing qualified record without an announcement flag', async () => {
    localStorage.setItem(
      config.storageKey,
      JSON.stringify({ best: 9, unlocked: true, announced: false }),
    );
    await mount();
    expect(root.querySelector('app-vip-reward')).toBeNull();
    expect(JSON.parse(localStorage.getItem(config.storageKey)!).announced).toBe(true);
    start();
    flush(0);
    collect();
    flush(20);
    const actor = (fixture.componentInstance as unknown as { pickup: { active: boolean } }).pickup;
    expect(actor.active).toBe(false);
  });
  it('finishes the mandatory pickup even if an obstacle ends the run during its arrival', async () => {
    config = { ...config, VIP_REWARD_THRESHOLD: 1 };
    await mount();
    start();
    flush(0);
    collect();
    flush(20);
    const c = config.game;
    Object.assign(engine().objects[1], {
      active: true,
      kind: 'obstacle',
      x: c.playerX,
      y: c.ground - c.obstacleHeight,
      width: c.obstacleWidth,
      height: c.obstacleHeight,
    });
    flush(40);
    expect(engine().running).toBe(false);
    reachReward();
    expect(root.querySelector('app-vip-reward')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('.reward-close')!.click();
    fixture.detectChanges();
    expect(root.textContent).toContain('GAME OVER');
    expect(engine().running).toBe(false);
  });
  it('keeps the launch deadline active while the reward dialog has paused the game', async () => {
    config = { ...config, VIP_REWARD_THRESHOLD: 1 };
    await mount();
    start();
    flush(0);
    collect();
    flush(20);
    reachReward();
    wall = Date.parse(config.launchAt);
    await new Promise((resolve) => setTimeout(resolve, 30));
    fixture.detectChanges();
    expect(root.querySelector('app-vip-reward')).toBeNull();
    expect(root.textContent).toContain('CHEGOU A HORA!');
  });
  it('fits the measured header, square stage and external footer again after resizing', async () => {
    await mount();
    const content = root.querySelector<HTMLElement>('.launch-content')!;
    const intro = root.querySelector<HTMLElement>('.launch-intro')!;
    const footer = root.querySelector<HTMLElement>('.vip-footer')!;
    const rect = (width: number, height: number) => ({ width, height }) as DOMRect;
    for (const [element, width, height] of [
      [content, 366, 626],
      [intro, 366, 144],
      [footer, 325, 44],
    ] as const)
      Object.defineProperty(element, 'getBoundingClientRect', {
        configurable: true,
        value: vi.fn(() => rect(width, height)),
      });
    window.dispatchEvent(new Event('resize'));
    expect(content.classList.contains('launch-content--wide')).toBe(false);
    const size = parseFloat(content.style.getPropertyValue('--stage-size'));
    expect(size).toBeGreaterThan(300);
    expect(size + 144 + 44 + 24).toBeLessThanOrEqual(626);
    vi.mocked(content.getBoundingClientRect).mockReturnValue(rect(820, 366));
    window.dispatchEvent(new Event('resize'));
    expect(content.classList.contains('launch-content--wide')).toBe(true);
    expect(
      parseFloat(content.style.getPropertyValue('--stage-size')) + 44 + 12,
    ).toBeLessThanOrEqual(366);
  });
  it('closes from any external screen area without turning that gesture into a jump', async () => {
    config = { ...config, VIP_REWARD_THRESHOLD: 1 };
    await mount();
    start();
    flush(0);
    collect();
    flush(20);
    reachReward();
    const velocity = engine().vy;
    const card = root.querySelector('.reward-card')!;
    point(card.querySelector('h2')!);
    expect(root.querySelector('app-vip-reward')).not.toBeNull();
    point(root.querySelector('.launch-brand')!);
    expect(root.querySelector('app-vip-reward')).toBeNull();
    expect(engine().vy).toBe(velocity);
    expect(root.querySelector<HTMLButtonElement>('.vip-access')?.disabled).toBe(false);
    expect(root.textContent).not.toContain('Link do grupo em breve');
  });
  it('keeps automatic modal focus unmarked and tracks intentional keyboard navigation locally', async () => {
    config = { ...config, VIP_REWARD_THRESHOLD: 1 };
    await mount();
    start();
    flush(0);
    collect();
    flush(20);
    reachReward();
    const shell = root.querySelector('.launch-shell')!;
    const card = root.querySelector<HTMLElement>('.reward-card')!;
    expect(document.activeElement).toBe(card);
    expect(shell.classList.contains('launch-shell--keyboard')).toBe(false);
    card.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(shell.classList.contains('launch-shell--keyboard')).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('.reward-close'));
    point(card);
    expect(shell.classList.contains('launch-shell--keyboard')).toBe(false);
    expect(root.querySelector('app-vip-reward')).not.toBeNull();
  });
  it('unlocks the theme on the first touch release even if mobile audio rejects pointerdown activation', async () => {
    let activation = false;
    const pending: (() => void)[] = [];
    const notes = vi.fn();
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'suspended';
        currentTime = 0;
        destination = {};
        onstatechange: ((event: Event) => void) | null = null;
        resume() {
          if (!activation) return new Promise<void>((resolve) => pending.push(resolve));
          this.state = 'running';
          this.onstatechange?.(new Event('statechange'));
          pending.splice(0).forEach((resolve) => resolve());
          return Promise.resolve();
        }
        suspend = async () => {
          this.state = 'suspended';
        };
        close = async () => {
          this.state = 'closed';
        };
        createGain = () => ({
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          disconnect: vi.fn(),
        });
        createOscillator = () => ({
          frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: notes,
          stop: vi.fn(),
          onended: null,
        });
      },
    );
    await mount();
    point(root.querySelector('canvas')!, 'touch');
    expect(engine().running).toBe(true);
    expect(notes).not.toHaveBeenCalled();
    const velocity = engine().vy;
    activation = true;
    root.querySelector('canvas')!.dispatchEvent(new Event('pointerup', { bubbles: true }));
    await Promise.resolve();
    expect(notes).toHaveBeenCalledTimes(1);
    root.querySelector('canvas')!.dispatchEvent(new Event('touchend', { bubbles: true }));
    await Promise.resolve();
    expect(notes).toHaveBeenCalledTimes(1);
    expect(engine().vy).toBe(velocity);
  });
  it.each([false, true])('renders native animation cells, reduced motion=%s', async (reduced) => {
    vi.mocked(window.matchMedia).mockImplementation(
      (query) =>
        ({
          matches: reduced && query.includes('prefers-reduced-motion'),
          addListener: vi.fn(),
          removeListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    await mount();
    start();
    flush(0);
    flush(100);
    const sprite = (
      fixture.componentInstance as unknown as { sprites: { image: CanvasImageSource }[] }
    ).sprites[0];
    const calls = vi
      .mocked(context.drawImage)
      .mock.calls.filter((call) => call[0] === sprite.image);
    const last = calls.at(-1)! as unknown as unknown[];
    expect(last[1]).toBe(reduced ? 0 : config.assets.player.frameWidth);
  });
});
