import {
  animationFrameAt,
  drawRunnerFrame,
  runningAnimationTime,
  type RunnerSprite,
} from './runner-animation';
import { DESKTOP_LAUNCH_MEDIA, fitLaunchLayout } from './launch-layout';
import { VipPickup, makeWhatsappSprite } from './vip-pickup';
import { LaunchCountdown } from './launch-countdown';
import { RunnerStage } from './runner-stage';
import { isRunnerControl, preferTouchInput, runnerProjection } from './runner-input';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
  signal,
} from '@angular/core';
import { LaunchSessionService } from './launch-session.service';
import { award, readReward, remaining, saveReward, type Reward } from './launch-state';
import { RunnerEngine } from './runner-engine';
import { loadRunnerSprites, RunnerAudio } from './runner-media';
import { createPixelLayers } from './pixel-reveal';
import { createPixelReveal } from './pixel-reveal';

let nextId = 0;
@Component({
  selector: 'app-launch-experience',
  imports: [LaunchCountdown, RunnerStage],
  templateUrl: './launch-experience.html',
  styleUrl: './launch-experience.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaunchExperience {
  protected readonly session = inject(LaunchSessionService);
  protected readonly config = this.session.config;
  protected readonly units = signal([
    { label: 'Dias', value: 0 },
    { label: 'Horas', value: 0 },
    { label: 'Minutos', value: 0 },
    { label: 'Segundos', value: 0 },
  ]);
  protected readonly mode = signal<
    'loading' | 'ready' | 'playing' | 'over' | 'error' | 'launching' | 'reward'
  >('loading');
  protected readonly score = signal(0);
  protected readonly best = signal(0);
  protected readonly vip = signal(false);
  protected readonly rewardOpen = signal(false);
  protected readonly muted = signal(false);
  protected readonly touchMode = signal(false);
  protected readonly masking = signal(false);
  protected readonly clockSynchronized = signal(false);
  protected readonly maskId = 'launch-pixels-' + ++nextId;
  protected readonly vipUrl = safeVipUrl(this.config.VIP_WHATSAPP_URL);
  protected readonly dateLabel = (() => {
    try {
      return this.session.instant === null
        ? ''
        : new Intl.DateTimeFormat('pt-BR', {
            timeZone: this.config.timeZone,
            dateStyle: 'long',
            timeStyle: 'short',
          }).format(this.session.instant);
    } catch {
      return '';
    }
  })();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly engine = new RunnerEngine(this.config.game);
  private readonly pickup = new VipPickup(this.config.vipPickup);
  private pickupSprite: HTMLCanvasElement | undefined;
  private readonly audio = new RunnerAudio(this.config.audio);
  private readonly abort = new AbortController();
  private readonly cleanups: (() => void)[] = [];
  private reward: Reward = { best: 0, unlocked: false, announced: false };
  private storage: Storage | undefined;
  private canvas: HTMLCanvasElement | undefined;
  private context: CanvasRenderingContext2D | null = null;
  private sprites: RunnerSprite[] = [];
  private animationElapsedMs = 0;
  private reducedMotion = false;
  private gameFrame = 0;
  private revealFrame = 0;
  private focusTimer: ReturnType<typeof setTimeout> | undefined;
  private clockTimer: ReturnType<typeof setTimeout> | undefined;
  private anticipationTimer: ReturnType<typeof setTimeout> | undefined;
  private lastFrame: number | undefined;
  private observer: ResizeObserver | undefined;
  private palette = { background: '#000f2c', cyan: '#06f4fc', ground: '#001c52' };
  private projection = { width: 1, height: 1, scale: 1, x: 0, y: 0 };
  private stripes: number[][] = [];
  private disposed = false;
  private releasing = false;
  private revealStarted: number | undefined;
  private revealPath: ((progress: number) => string) | undefined;
  private layerPaths: ((progress: number) => string[]) | undefined;
  private clockSyncing = false;
  private launchChecked = false;
  private lastClockSync = -Infinity;
  private nextClockAttempt = 0;

  constructor() {
    afterNextRender(() => {
      if (!this.session.active()) return;
      if (
        this.session.instant === null ||
        (this.session.clock.now() !== null && this.session.clock.now()! >= this.session.instant)
      ) {
        this.session.reveal();
        return;
      }
      this.zone.runOutsideAngular(() => this.initialize());
    });
    this.destroyRef.onDestroy(() => {
      this.dispose();
      if (this.focusTimer) clearTimeout(this.focusTimer);
    });
  }
  private initialize(): void {
    const root = this.host.nativeElement;
    this.canvas = root.querySelector<HTMLCanvasElement>('canvas') ?? undefined;
    this.context = this.canvas?.getContext('2d') ?? null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.cleanups.push(() => {
      document.body.style.overflow = overflow;
    });
    try {
      this.storage = window.localStorage;
    } catch {
      /* Keep rewards in memory. */
    }
    this.reward = readReward(this.storage, this.config);
    if (this.reward.unlocked && !this.reward.announced) {
      this.reward = { ...this.reward, announced: true };
      saveReward(this.storage, this.reward, this.config.storageKey);
    }
    this.syncReward();
    this.pickupSprite = makeWhatsappSprite('#b6eff4');
    const colors = getComputedStyle(root);
    this.palette = {
      background: colors.getPropertyValue('--runner-background').trim() || this.palette.background,
      cyan: colors.getPropertyValue('--runner-accent').trim() || this.palette.cyan,
      ground: colors.getPropertyValue('--runner-ground').trim() || this.palette.ground,
    };
    this.touchMode.set(
      preferTouchInput(
        navigator.userAgent,
        navigator.maxTouchPoints || 0,
        window.matchMedia('(pointer: coarse)').matches,
      ),
    );
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = motion.matches;
    const motionChanged = () => {
      this.reducedMotion = motion.matches;
      this.draw();
    };
    motion.addEventListener?.('change', motionChanged);
    this.cleanups.push(() => motion.removeEventListener?.('change', motionChanged));
    this.resize();
    if (typeof ResizeObserver !== 'undefined' && this.canvas) {
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(this.canvas.closest('[data-runner-viewport]') ?? this.canvas);
      for (const element of root.querySelectorAll('.launch-content, .launch-intro'))
        this.observer.observe(element);
    }
    const resize = () => this.resize();
    window.addEventListener('resize', resize, { passive: true });
    this.cleanups.push(() => window.removeEventListener('resize', resize));

    const key = (event: KeyboardEvent) => {
      if (this.rewardOpen()) return;
      if (event.key === 'Tab' && event.shiftKey) {
        this.trapTab(event);
        return;
      }
      if (!['Space', 'ArrowUp', 'Tab'].includes(event.code)) return;
      if (event.code === 'Tab' || ['ready', 'playing', 'over'].includes(this.mode()))
        event.preventDefault();
      if (this.releasing) {
        event.preventDefault();
        return;
      }
      if (event.repeat || document.hidden) return;
      if (!['ready', 'playing', 'over'].includes(this.mode())) return;
      event.preventDefault();
      this.touchMode.set(false);
      this.interact();
    };
    const pointer = (event: PointerEvent) => {
      this.shell()?.classList.remove('launch-shell--keyboard');
      if (this.releasing || document.hidden || event.isPrimary === false || event.button > 0)
        return;
      if (this.rewardOpen()) {
        const card = root.querySelector('.reward-card');
        if (card && event.target instanceof Node && !card.contains(event.target)) {
          event.preventDefault();
          this.closeReward();
        }
        return;
      }
      if (isRunnerControl(event.target)) return;
      if (!['ready', 'playing', 'over'].includes(this.mode())) return;
      event.preventDefault();
      if (event.pointerType === 'touch' || event.pointerType === 'pen') this.touchMode.set(true);
      else if (event.pointerType === 'mouse') this.touchMode.set(false);
      this.interact();
    };
    const finishGesture = () => {
      if (!this.disposed && !this.releasing && !document.hidden && this.mode() === 'playing')
        this.audio.unlock();
    };
    const keyboardFocus = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && (this.rewardOpen() || event.shiftKey))
        this.shell()?.classList.add('launch-shell--keyboard');
    };
    const focus = (event: FocusEvent) => {
      if (!this.session.active() || this.disposed) return;
      const target = event.target;
      if (this.rewardOpen()) {
        const modal = root.querySelector('app-vip-reward');
        if (target instanceof Node && modal && !modal.contains(target))
          modal.querySelector<HTMLElement>('.reward-card')?.focus({ preventScroll: true });
        return;
      }
      if (target instanceof Node && !root.contains(target))
        this.shell()?.focus({ preventScroll: true });
    };
    const visibility = () => {
      this.lastFrame = undefined;
      cancelAnimationFrame(this.gameFrame);
      if (this.clockTimer) clearTimeout(this.clockTimer);
      if (document.hidden) {
        this.audio.suspend();
        if (this.releasing) this.finish();
      } else {
        this.lastClockSync = -Infinity;
        this.nextClockAttempt = 0;
        this.tickClock();
        // Audio resumes only on a new user gesture.
        if ((this.engine.running || this.pickup.active) && !this.releasing && !this.rewardOpen())
          this.gameFrame = requestAnimationFrame((time) => this.frame(time));
      }
    };
    const storage = () => {
      const latest = readReward(this.storage, this.config);
      this.reward = {
        best: Math.max(latest.best, this.reward.best),
        unlocked: latest.unlocked || this.reward.unlocked,
        announced: latest.announced || this.reward.announced,
      };
      this.syncReward();
    };
    window.addEventListener('keydown', key);
    const shell = this.shell();
    shell?.addEventListener('pointerdown', pointer);
    shell?.addEventListener('pointerup', finishGesture, { passive: true });
    shell?.addEventListener('touchend', finishGesture, { passive: true });
    shell?.addEventListener('keydown', keyboardFocus, true);
    document.addEventListener('focusin', focus);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('storage', storage);
    this.cleanups.push(() => {
      window.removeEventListener('keydown', key);
      shell?.removeEventListener('pointerdown', pointer);
      shell?.removeEventListener('pointerup', finishGesture);
      shell?.removeEventListener('touchend', finishGesture);
      shell?.removeEventListener('keydown', keyboardFocus, true);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('storage', storage);
    });
    this.shell()?.focus({ preventScroll: true });
    this.tickClock();
    if (!this.context || !this.canvas) {
      this.mode.set('error');
      return;
    }
    void loadRunnerSprites(this.config, this.abort.signal)
      .then((sprites) => {
        if (this.disposed || this.releasing) {
          sprites.forEach((sprite) => sprite.dispose());
          return;
        }
        this.sprites = sprites;
        this.mode.set('ready');
        this.draw();
        if (document.activeElement === this.shell()) this.canvas?.focus({ preventScroll: true });
      })
      .catch(() => {
        if (!this.disposed && !this.releasing) this.mode.set('error');
      });
  }
  private shell(): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>('.launch-shell');
  }
  private trapTab(event: KeyboardEvent): void {
    const nodes = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]),a[href],canvas[tabindex="0"]',
      ),
    );
    const first = nodes[0],
      last = nodes.at(-1);
    if (!first) {
      event.preventDefault();
      this.shell()?.focus();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === first || !nodes.includes(document.activeElement as HTMLElement))
    ) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !nodes.includes(document.activeElement as HTMLElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }
  private refreshClock(): void {
    if (
      this.clockSyncing ||
      this.disposed ||
      this.releasing ||
      performance.now() < this.nextClockAttempt
    )
      return;
    this.clockSyncing = true;
    void this.session.clock.sync().then((ok) => {
      this.clockSyncing = false;
      if (this.disposed || this.releasing) return;
      if (!ok) {
        this.nextClockAttempt = performance.now() + this.config.timeSource.retryMs;
        return;
      }
      this.nextClockAttempt = 0;
      this.lastClockSync = performance.now();
      const now = this.session.clock.now();
      if (now !== null && this.session.instant !== null && now >= this.session.instant) {
        if (!this.launchChecked) this.finish();
        else this.beginReveal();
      } else this.launchChecked = true;
      this.clockSynchronized.set(now !== null);
    });
  }
  private tickClock(): void {
    if (this.disposed || this.releasing || this.session.instant === null) return;
    const now = this.session.clock.now();
    this.clockSynchronized.set(now !== null);
    if (now !== null) {
      const values = remaining(this.session.instant, now);
      if (values.some((value, index) => value !== this.units()[index].value))
        this.units.update((units) =>
          units.map((unit, index) => ({ ...unit, value: values[index] })),
        );
      if (now >= this.session.instant) this.refreshClock();
      this.launchChecked = true;
    }
    if (now === null || performance.now() - this.lastClockSync >= this.config.timeSource.refreshMs)
      this.refreshClock();
    if (!document.hidden)
      this.clockTimer = setTimeout(() => this.tickClock(), this.config.countdownRefreshMs);
  }
  private fitLayout(): void {
    const root = this.host.nativeElement;
    const container = root.querySelector<HTMLElement>('.launch-content');
    const intro = root.querySelector<HTMLElement>('.launch-intro');
    const footer = root.querySelector<HTMLElement>('.vip-footer');
    if (!container || !intro || !footer) return;
    const rect = container.getBoundingClientRect();
    const layout = fitLaunchLayout({
      width: container.clientWidth || rect.width,
      height: container.clientHeight || rect.height,
      introHeight: intro.getBoundingClientRect().height,
      footerHeight: footer.getBoundingClientRect().height,
      gap: parseFloat(getComputedStyle(container).rowGap) || 12,
      desktop: window.matchMedia(DESKTOP_LAUNCH_MEDIA).matches,
    });
    container.classList.toggle('launch-content--wide', layout.wide);
    container.style.setProperty('--stage-size', layout.size + 'px');
    container.style.setProperty('--stage-width', layout.stageWidth + 'px');
  }
  private resize(): void {
    if (this.disposed) return;
    this.fitLayout();
    if (!this.canvas) return;
    const viewport = this.canvas.closest<HTMLElement>('[data-runner-viewport]') ?? this.canvas;
    const rect = viewport.getBoundingClientRect();
    const width = viewport.clientWidth || rect.width;
    const height = viewport.clientHeight || rect.height;
    this.engine.setWidth(width);
    const dpr = Math.min(window.devicePixelRatio || 1, this.config.game.maxDpr);
    this.projection = runnerProjection(
      width,
      height,
      this.engine.width,
      this.config.game.height,
      dpr,
    );
    this.canvas.width = this.projection.width;
    this.canvas.height = this.projection.height;
    this.stripes = [0.35, 0.8].map((start) => [
      this.canvas!.width * start,
      0,
      this.canvas!.width * (start + 0.04),
      0,
      this.canvas!.width * (start + 0.04) - this.canvas!.height,
      this.canvas!.height,
      this.canvas!.width * start - this.canvas!.height,
      this.canvas!.height,
    ]);
    this.draw();
    if (this.releasing) this.prepareReveal();
  }
  private interact(): void {
    if (this.rewardOpen() || (this.mode() === 'over' && this.pickup.active)) return;
    this.canvas?.focus({ preventScroll: true });
    this.audio.unlock();
    if (this.mode() === 'ready' || this.mode() === 'over') this.play();
    if (this.engine.running) this.engine.jump();
  }
  protected play(): void {
    if (this.disposed || this.releasing || !['ready', 'over'].includes(this.mode())) return;
    this.rewardOpen.set(false);
    this.audio.unlock();
    this.engine.start();
    this.animationElapsedMs = 0;
    this.audio.startMusic();
    this.score.set(0);
    this.mode.set('playing');
    this.canvas?.setAttribute('tabindex', '0');
    this.canvas?.focus({ preventScroll: true });
    this.lastFrame = undefined;
    cancelAnimationFrame(this.gameFrame);
    this.gameFrame = requestAnimationFrame((time) => this.frame(time));
  }
  protected toggleMute(): void {
    this.muted.update((value) => !value);
    this.audio.muted = this.muted();
    if (this.muted()) this.audio.suspend();
    else this.audio.unlock();
    this.canvas?.focus({ preventScroll: true });
  }
  private syncReward(): void {
    this.best.set(this.reward.best);
    this.vip.set(this.reward.unlocked && this.reward.announced);
  }
  private frame(time: number): void {
    if (
      this.disposed ||
      document.hidden ||
      this.releasing ||
      this.rewardOpen() ||
      (!this.engine.running && !this.pickup.active)
    )
      return;
    const dt =
      this.lastFrame === undefined
        ? 0
        : Math.min(this.config.game.maxFrameSeconds, (time - this.lastFrame) / 1000);
    const previous = this.engine.score;
    const wasRunning = this.engine.running;
    this.engine.advance(dt);
    if (wasRunning) this.animationElapsedMs += dt * 1000;
    this.lastFrame = time;
    if (previous !== this.engine.score) {
      this.score.set(this.engine.score);
      this.audio.play('collect');
      const latest = readReward(this.storage, this.config);
      this.reward = {
        best: Math.max(latest.best, this.reward.best),
        unlocked: latest.unlocked || this.reward.unlocked,
        announced: latest.announced || this.reward.announced,
      };
      const result = award(this.reward, this.engine.score, this.config.VIP_REWARD_THRESHOLD);
      // Acknowledge the announcement when the homing icon actually opens the dialog.
      this.reward = { ...result.reward, announced: this.reward.announced };
      if (result.celebrate && !this.pickup.active)
        this.pickup.start(
          this.engine.width,
          this.config.game.ground,
          window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        );
      this.syncReward();
      saveReward(this.storage, this.reward, this.config.storageKey);
    }
    if (wasRunning && !this.engine.running) {
      this.mode.set('over');
      this.audio.play('collision');
    }
    const c = this.config.game;
    const collected = this.pickup.advance(dt, {
      x: c.playerX,
      y: this.engine.y,
      width: c.playerWidth,
      height: c.playerHeight,
    });
    this.draw();
    if (collected) this.openReward();
    if (!this.rewardOpen() && (this.engine.running || this.pickup.active))
      this.gameFrame = requestAnimationFrame((next) => this.frame(next));
  }
  private openReward(): void {
    if (this.reward.announced || this.releasing || this.disposed) return;
    this.reward = { ...this.reward, unlocked: true, announced: true };
    saveReward(this.storage, this.reward, this.config.storageKey);
    this.syncReward();
    this.mode.set('reward');
    this.rewardOpen.set(true);
    cancelAnimationFrame(this.gameFrame);
    this.lastFrame = undefined;
    this.audio.suspend();
  }
  protected closeReward(): void {
    if (!this.rewardOpen() || this.releasing || this.disposed) return;
    this.rewardOpen.set(false);
    this.mode.set(this.engine.running ? 'playing' : 'over');
    this.lastFrame = undefined;
    this.audio.unlock();
    if (this.engine.running && !document.hidden)
      this.gameFrame = requestAnimationFrame((time) => this.frame(time));
    this.focusTimer = setTimeout(() => {
      if (!this.disposed && !this.rewardOpen()) this.canvas?.focus({ preventScroll: true });
    }, 0);
  }
  private draw(): void {
    const context = this.context,
      canvas = this.canvas,
      c = this.config.game;
    if (!context || !canvas || this.disposed) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = this.palette.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = this.palette.cyan;
    context.globalAlpha = 0.04;
    for (const points of this.stripes) {
      context.beginPath();
      context.moveTo(points[0], points[1]);
      for (let index = 2; index < points.length; index += 2)
        context.lineTo(points[index], points[index + 1]);
      context.closePath();
      context.fill();
    }
    context.globalAlpha = 1;
    const projection = this.projection;
    context.setTransform(projection.scale, 0, 0, projection.scale, projection.x, projection.y);
    context.strokeStyle = this.palette.cyan;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, c.ground);
    context.lineTo(this.engine.width, c.ground);
    context.stroke();
    context.fillStyle = this.palette.ground;
    for (const x of this.engine.scenery)
      context.fillRect(x, c.ground + 12, this.engine.width * c.segmentWidthRatio - 8, 5);
    context.imageSmoothingEnabled = false;
    const times = [
      runningAnimationTime(
        this.engine.distance,
        c.initialSpeed,
        this.config.spriteAnimation.playerRate,
      ),
      this.animationElapsedMs * this.config.spriteAnimation.obstacleRate,
      this.animationElapsedMs * this.config.spriteAnimation.boltRate,
    ];
    const indices = this.sprites.map((sprite, index) =>
      this.reducedMotion ? 0 : animationFrameAt(sprite.asset.frameDurationsMs, times[index]),
    );
    const sprite = (index: number, x: number, y: number, width: number, height: number) => {
      const resource = this.sprites[index];
      if (resource) drawRunnerFrame(context, resource, indices[index], x, y, width, height);
    };
    sprite(0, c.playerX, this.engine.y, c.playerWidth, c.playerHeight);
    for (const object of this.engine.objects)
      if (object.active)
        sprite(object.kind === 'obstacle' ? 1 : 2, object.x, object.y, object.width, object.height);
    if (this.pickup.active && this.pickupSprite)
      context.drawImage(
        this.pickupSprite,
        this.pickup.x,
        this.pickup.y,
        this.config.vipPickup.size,
        this.config.vipPickup.size,
      );
  }
  private prepareReveal(): void {
    const rect = this.shell()?.getBoundingClientRect();
    if (rect) {
      this.revealPath = createPixelReveal(rect.width, rect.height, this.config.reveal);
      this.layerPaths = createPixelLayers(rect.width, rect.height, this.config.reveal);
    }
  }
  private beginReveal(): void {
    if (this.releasing || this.disposed) return;
    this.releasing = true;
    this.rewardOpen.set(false);
    this.pickup.cancel();
    this.mode.set('launching');
    this.engine.stop();
    this.canvas?.setAttribute('tabindex', '-1');
    cancelAnimationFrame(this.gameFrame);
    if (this.clockTimer) clearTimeout(this.clockTimer);
    this.audio.close();
    this.abort.abort();
    if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.finish();
      return;
    }
    this.anticipationTimer = setTimeout(() => {
      if (this.disposed) return;
      this.session.prepareLanding();
      this.prepareReveal();
      this.masking.set(true);
      this.revealFrame = requestAnimationFrame((time) => this.revealTick(time));
    }, this.config.reveal.anticipationMs);
  }
  private revealTick(time: number): void {
    if (this.disposed) return;
    this.revealStarted ??= time;
    const progress = Math.min(1, (time - this.revealStarted) / this.config.reveal.durationMs);
    this.host.nativeElement
      .querySelector<SVGPathElement>('[data-pixel-path]')
      ?.setAttribute('d', this.revealPath?.(progress) || '');
    const layers = this.layerPaths?.(progress) ?? [];
    this.host.nativeElement
      .querySelectorAll<SVGPathElement>('[data-pixel-layer]')
      .forEach((path, index) => path.setAttribute('d', layers[index] ?? ''));
    if (progress < 1) this.revealFrame = requestAnimationFrame((next) => this.revealTick(next));
    else this.finish();
  }
  private finish(): void {
    if (this.disposed) return;
    this.dispose();
    this.session.reveal();
    this.focusTimer = setTimeout(() => {
      let fragment = '';
      try {
        const hash = window.location.hash.slice(1);
        const anchor = hash.includes('#')
          ? hash.slice(hash.indexOf('#') + 1)
          : hash.startsWith('/')
            ? ''
            : hash;
        fragment = decodeURIComponent(anchor);
      } catch {
        /* malformed URL */
      }
      const target = document.getElementById(fragment || 'inicio');
      target?.focus({ preventScroll: true });
    }, 0);
  }
  private dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.masking.set(false);
    this.revealPath = undefined;
    this.layerPaths = undefined;
    cancelAnimationFrame(this.gameFrame);
    cancelAnimationFrame(this.revealFrame);
    if (this.clockTimer) clearTimeout(this.clockTimer);
    if (this.anticipationTimer) clearTimeout(this.anticipationTimer);
    this.pickup.cancel();
    this.rewardOpen.set(false);
    if (this.pickupSprite) {
      this.pickupSprite.width = this.pickupSprite.height = 0;
    }
    this.pickupSprite = undefined;
    this.engine.stop();
    this.session.clock.cancel();
    this.audio.close();
    this.abort.abort();
    this.observer?.disconnect();
    this.cleanups.splice(0).forEach((cleanup) => cleanup());
    this.sprites.forEach((sprite) => sprite.dispose());
    this.sprites = [];
  }
}
export function safeVipUrl(value: string): string {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}
