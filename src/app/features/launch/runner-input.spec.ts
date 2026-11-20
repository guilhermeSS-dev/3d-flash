import { isRunnerControl, preferTouchInput, runnerProjection } from './runner-input';

describe('Input-aware runner UI and projection', () => {
  it('detects mobile user agents, coarse touch and iPad desktop mode while retaining desktop keyboard hints', () => {
    expect(preferTouchInput('iPhone Mobile Safari', 1, false)).toBe(true);
    expect(preferTouchInput('Android', 0, false)).toBe(true);
    expect(preferTouchInput('Macintosh Safari', 5, false)).toBe(true);
    expect(preferTouchInput('Windows Chrome', 0, true)).toBe(true);
    expect(preferTouchInput('Windows Chrome', 1, false)).toBe(false);
    expect(preferTouchInput('Macintosh Safari', 0, false)).toBe(false);
  });
  it('excludes nested control icons and VIP areas without excluding neutral screen areas', () => {
    const button = document.createElement('button');
    button.innerHTML = '<svg><path></path></svg>';
    expect(isRunnerControl(button.querySelector('path'))).toBe(true);
    const panel = document.createElement('div');
    panel.dataset['noGameInput'] = '';
    panel.innerHTML = '<span>VIP</span>';
    expect(isRunnerControl(panel.firstChild)).toBe(true);
    expect(isRunnerControl(document.createElement('canvas'))).toBe(false);
    expect(isRunnerControl(window)).toBe(false);
  });
  it.each([
    [320, 360],
    [390, 500],
    [768, 280],
    [900, 180],
    [1100, 640],
    [600, 120],
  ])('keeps aspect ratio and sprites within a %s x %s viewport', (width, height) => {
    for (const dpr of [1, 2]) {
      const projection = runnerProjection(width, height, 900, 280, dpr);
      expect(projection.width).toBe(width * dpr);
      expect(projection.height).toBe(height * dpr);
      expect(projection.x).toBeGreaterThanOrEqual(0);
      expect(projection.y).toBeGreaterThanOrEqual(0);
      expect(projection.x + 900 * projection.scale).toBeLessThanOrEqual(projection.width + 0.00001);
      expect(projection.y + 280 * projection.scale).toBeCloseTo(projection.height, 5);
    }
  });
});
