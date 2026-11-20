import { launchConfig, type LaunchConfig } from '../../core/config/launch.config';

export type RunnerSettings = LaunchConfig['game'];
export interface RunnerObject {
  active: boolean;
  kind: 'obstacle' | 'bolt';
  x: number;
  y: number;
  width: number;
  height: number;
}
export class RunnerEngine {
  readonly objects: RunnerObject[];
  readonly scenery = [0, 0, 0];
  score = 0;
  running = false;
  dead = false;
  y: number;
  vy = 0;
  speed: number;
  distance = 0;
  segments = 0;
  width: number;
  readonly patternHistory: number[] = [];
  private accumulator = 0;
  private nextChallenge = 0;
  private recovery = 0;

  constructor(
    readonly settings: RunnerSettings = launchConfig.game,
    private random: () => number = Math.random,
  ) {
    this.width = settings.width;
    this.y = settings.ground - settings.playerHeight;
    this.speed = settings.initialSpeed;
    this.objects = Array.from({ length: settings.objectPoolSize }, () => ({
      active: false,
      kind: 'bolt',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    }));
    this.resetScenery();
  }
  setWidth(width: number): void {
    if (!Number.isFinite(width)) return;
    // Retain the world and hitboxes while resizing an active run.
    if (this.running) return;
    this.width = Math.max(this.settings.minWidth, Math.min(this.settings.width, width));
    this.resetScenery();
  }
  start(): void {
    const c = this.settings;
    this.score = 0;
    this.running = true;
    this.dead = false;
    this.y = c.ground - c.playerHeight;
    this.vy = 0;
    this.distance = 0;
    this.segments = 0;
    this.speed = c.initialSpeed;
    this.accumulator = 0;
    this.recovery = 0;
    this.nextChallenge = this.speed * c.initialGraceSeconds;
    this.patternHistory.length = 0;
    this.objects.forEach((object) => (object.active = false));
    this.resetScenery();
  }
  stop(): void {
    this.running = false;
  }
  jump(): boolean {
    if (
      !this.running ||
      this.vy !== 0 ||
      this.y < this.settings.ground - this.settings.playerHeight - 0.01 ||
      this.recovery > 0
    )
      return false;
    this.vy = -this.settings.jumpImpulse;
    return true;
  }
  advance(seconds: number): void {
    if (!this.running || !Number.isFinite(seconds) || seconds <= 0) return;
    this.accumulator += Math.min(seconds, this.settings.maxFrameSeconds);
    while (this.accumulator >= this.settings.fixedStep && this.running) {
      this.step(this.settings.fixedStep);
      this.accumulator -= this.settings.fixedStep;
    }
  }
  private roll(): number {
    return Math.max(0, Math.min(0.999999, this.random()));
  }
  private resetScenery(): void {
    this.scenery.forEach(
      (_, index) => (this.scenery[index] = index * this.width * this.settings.segmentWidthRatio),
    );
  }
  private spawn(): void {
    const c = this.settings;
    const stage = Math.floor(this.segments / c.progressionSegments);
    const count = stage >= c.overheadStartStage ? 12 : stage >= c.airborneStartStage ? 10 : 6;
    const options = Array.from({ length: count }, (_, index) => index).filter(
      (id) => !this.patternHistory.includes(id),
    );
    const pattern = options[Math.floor(this.roll() * options.length)];
    this.patternHistory.push(pattern);
    if (this.patternHistory.length > Math.min(c.recentPatterns, count - 1))
      this.patternHistory.shift();
    const x = this.width + c.spawnPadding;
    const airTime = (2 * c.jumpImpulse) / c.gravity;
    const safeGap = this.speed * (airTime + c.recoverySeconds + c.reactionSeconds);
    const pairOffset = pattern === 9 || pattern === 11 ? safeGap : 0;
    const level = pattern >= 10 ? 3 : pattern >= 8 ? 2 : 1;
    const obstacle = (at: number) =>
      this.put(
        'obstacle',
        at,
        level === 3
          ? c.ground - c.playerHeight - c.overheadClearance - c.obstacleHeight
          : c.ground - c.obstacleHeight - (level === 2 ? c.middleObstacleLift : 0),
      );
    const coin = (at: number, high: boolean) =>
      this.put(
        'bolt',
        at,
        c.ground -
          (high
            ? c.coinMinJumpHeight + this.roll() * (c.coinJumpHeight - c.coinMinJumpHeight)
            : c.boltHeight),
      );
    if (pattern < 4 || pattern >= 8) {
      obstacle(x);
      coin(x + ((pattern % 3) - 1) * this.speed * c.patternOffsetRatio, level !== 3);
      if (pairOffset) {
        obstacle(x + pairOffset);
        coin(x + pairOffset, level !== 3);
      }
    } else {
      coin(x, pattern % 2 === 0);
      coin(x + this.speed * (airTime + c.recoverySeconds), pattern % 2 !== 0);
    }
    const lastOffset =
      pairOffset || (pattern >= 4 && pattern < 8 ? this.speed * (airTime + c.recoverySeconds) : 0);
    this.nextChallenge =
      this.distance + lastOffset + safeGap + this.roll() * this.speed * c.gapVariation;
  }
  private put(kind: RunnerObject['kind'], x: number, y: number): void {
    const item = this.objects.find((object) => !object.active);
    if (!item) return;
    const c = this.settings;
    Object.assign(item, {
      active: true,
      kind,
      x,
      y,
      width: kind === 'bolt' ? c.boltWidth : c.obstacleWidth,
      height: kind === 'bolt' ? c.boltHeight : c.obstacleHeight,
    });
  }
  private step(dt: number): void {
    const c = this.settings;
    const segmentLength = this.width * c.segmentWidthRatio;
    this.segments = Math.floor(this.distance / segmentLength);
    const stage = Math.floor(this.segments / c.progressionSegments);
    const visibleSpeed =
      (this.width - c.playerX - c.playerWidth - c.spawnPadding) / c.reactionSeconds;
    const limit = Math.min(c.speedLimit, visibleSpeed);
    const target =
      c.initialSpeed + Math.max(0, limit - c.initialSpeed) * (1 - Math.exp(-stage * c.speedCurve));
    this.speed += (target - this.speed) * Math.min(1, dt * c.speedSmoothing);
    const dx = this.speed * dt;
    this.distance += dx;
    this.recovery = Math.max(0, this.recovery - dt);
    const wasAirborne = this.y < c.ground - c.playerHeight;
    this.vy += c.gravity * dt;
    this.y = Math.min(c.ground - c.playerHeight, this.y + this.vy * dt);
    if (this.y >= c.ground - c.playerHeight) {
      this.vy = 0;
      if (wasAirborne) this.recovery = c.recoverySeconds;
    }
    for (let index = 0; index < this.scenery.length; index++) {
      this.scenery[index] -= dx;
      if (this.scenery[index] + segmentLength < 0)
        this.scenery[index] += this.scenery.length * segmentLength;
    }
    if (this.distance >= this.nextChallenge) this.spawn();
    const inset = c.hitboxInset;
    const hit = (object: RunnerObject) => {
      const objectInset = object.kind === 'bolt' ? c.collectibleInset : inset;
      return (
        c.playerX + inset < object.x + object.width - objectInset &&
        c.playerX + c.playerWidth - inset > object.x + objectInset &&
        this.y + inset < object.y + object.height - objectInset &&
        this.y + c.playerHeight - inset > object.y + objectInset
      );
    };
    // Collision wins over a collectible reached in the same simulation step.
    for (const item of this.objects) {
      if (!item.active) continue;
      item.x -= dx;
      if (item.x + item.width < 0) item.active = false;
    }
    if (this.objects.some((item) => item.active && item.kind === 'obstacle' && hit(item))) {
      this.running = false;
      this.dead = true;
      return;
    }
    for (const item of this.objects) {
      if (item.active && item.kind === 'bolt' && hit(item)) {
        item.active = false;
        this.score++;
      }
    }
  }
}
