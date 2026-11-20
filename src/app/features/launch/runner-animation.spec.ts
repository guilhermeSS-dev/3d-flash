import { launchConfig } from '../../core/config/launch.config';
import {
  animationFrameAt,
  drawRunnerFrame,
  runningAnimationTime,
  type RunnerSprite,
} from './runner-animation';

describe('Original GIF cadence synchronized with scene displacement', () => {
  it('advances running time in exactly the scene-speed ratio without FPS-dependent counters', () => {
    const base = launchConfig.game.initialSpeed;
    expect(runningAnimationTime(base, base)).toBe(1000);
    expect(runningAnimationTime(base * 2, base)).toBe(2000);
    expect(runningAnimationTime(launchConfig.game.speedLimit, base) / 1000).toBeCloseTo(
      launchConfig.game.speedLimit / base,
    );
    expect(runningAnimationTime(base, base, 1.5)).toBe(1500);
    for (const fps of [30, 60, 120]) {
      let distance = 0;
      for (let i = 0; i < fps; i++) distance += 400 / fps;
      expect(runningAnimationTime(distance, base)).toBeCloseTo((400 / base) * 1000);
    }
  });
  it('respects original frame durations, wraps indefinitely and supports independent asset rates', () => {
    const durations = [70, 130, 90];
    for (const [time, frame] of [
      [0, 0],
      [69, 0],
      [70, 1],
      [199, 1],
      [200, 2],
      [289, 2],
      [290, 0],
      [360, 1],
    ])
      expect(animationFrameAt(durations, time)).toBe(frame);
    expect(animationFrameAt(durations, 35, 2)).toBe(1);
    expect(animationFrameAt(durations, 500, 0)).toBe(0);
    expect(animationFrameAt(durations, NaN)).toBe(0);
  });
  it('draws a different source cell with the same scale and anchor, preserving all original pixels', () => {
    const drawImage = vi.fn();
    const context = { drawImage } as unknown as CanvasRenderingContext2D;
    const sprite: RunnerSprite = {
      image: document.createElement('img'),
      asset: {
        src: '/atlas.png',
        frameWidth: 100,
        frameHeight: 100,
        frameDurationsMs: [90, 90, 90],
        anchor: [50, 50],
        referenceHeight: 50,
      },
      dispose: vi.fn(),
    };
    drawRunnerFrame(context, sprite, 0, 10, 20, 20, 40);
    drawRunnerFrame(context, sprite, 2, 10, 20, 20, 40);
    expect(drawImage).toHaveBeenNthCalledWith(1, sprite.image, 0, 0, 100, 100, -20, 0, 80, 80);
    expect(drawImage).toHaveBeenNthCalledWith(2, sprite.image, 200, 0, 100, 100, -20, 0, 80, 80);
  });
});
