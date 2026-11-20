import { type LaunchConfig } from '../../core/config/launch.config';

export type RunnerAsset = LaunchConfig['assets'][keyof LaunchConfig['assets']];
export interface RunnerSprite {
  readonly image: CanvasImageSource;
  readonly asset: RunnerAsset;
  dispose(): void;
}

/** Advance running frames by world distance: 2x scene speed produces exactly 2x cadence. */
export function runningAnimationTime(distance: number, initialSpeed: number, rate = 1): number {
  if (!Number.isFinite(distance) || initialSpeed <= 0 || !Number.isFinite(initialSpeed)) return 0;
  return (Math.max(0, distance) / initialSpeed) * 1000 * Math.max(0, rate);
}
export function animationFrameAt(
  durations: readonly number[],
  elapsedMs: number,
  rate = 1,
): number {
  if (!durations.length || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  const total = durations.reduce((sum, duration) => sum + Math.max(1, duration), 0);
  let remaining = (elapsedMs * Math.max(0, rate)) % total;
  for (let index = 0; index < durations.length; index++) {
    const duration = Math.max(1, durations[index]);
    if (remaining < duration) return index;
    remaining -= duration;
  }
  return 0;
}
export function drawRunnerFrame(
  context: CanvasRenderingContext2D,
  sprite: RunnerSprite,
  frame: number,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const asset = sprite.asset;
  const scale = height / asset.referenceHeight;
  context.drawImage(
    sprite.image,
    frame * asset.frameWidth,
    0,
    asset.frameWidth,
    asset.frameHeight,
    x + width / 2 - asset.anchor[0] * scale,
    y + height / 2 - asset.anchor[1] * scale,
    asset.frameWidth * scale,
    asset.frameHeight * scale,
  );
}
