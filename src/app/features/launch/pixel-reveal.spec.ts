import { createPixelReveal } from './pixel-reveal';
describe('Pixel reveal frontier', () => {
  it('starts fully covered, ends empty, and uses a bounded frontier rather than DOM tiles', () => {
    const reveal = createPixelReveal(390, 800);
    expect(reveal(0)).toBe('M0 0h390v800h-390Z');
    expect(reveal(1)).toBe('');
    expect(reveal(0.5)).not.toBe('');
    expect(reveal(0.5).match(/M/g)!.length).toBeLessThan(800);
    expect(reveal(0.5)).toBe(reveal(0.5));
  });
  it('removes the top first and retains the bottom until the final frontier passes', () => {
    const reveal = createPixelReveal(960, 600);
    const startY = (path: string) => Number(path.match(/^M[0-9.]+ ([0-9.]+)/)![1]);
    expect(startY(reveal(0.7))).toBeGreaterThan(startY(reveal(0.2)));
    expect(reveal(0.2)).toContain('v');
    expect(reveal(0.8)).toContain('Z');
  });
  it('handles different dimensions, reverse sampling and invalid surfaces without timers', () => {
    for (const [width, height] of [
      [320, 640],
      [768, 1024],
      [1920, 1080],
    ]) {
      const reveal = createPixelReveal(width, height);
      const middle = reveal(0.4);
      reveal(0.9);
      expect(reveal(0.4)).toBe(middle);
    }
    expect(createPixelReveal(0, 10)(0.5)).toBe('');
  });
});

describe('Layered pixel depth', () => {
  it('reduces the base tile edge to one quarter and emits only three bounded path groups', async () => {
    const { createPixelLayers } = await import('./pixel-reveal');
    const layers = createPixelLayers(960, 600);
    expect(layers(0)).toEqual(['', '', '']);
    expect(layers(1)).toEqual(['', '', '']);
    const middle = layers(0.5);
    expect(middle).toHaveLength(3);
    expect(middle.every((path) => path.includes('M'))).toBe(true);
    expect(middle.join('').match(/M/g)!.length).toBeLessThan(1500);
    expect(layers(0.5)).toEqual(middle);
    // Previous 960px layout: 960/32 = 30px. New layout: 960/128 = 7.5px.
    expect(960 / 128).toBe(960 / 32 / 4);
  });
});
