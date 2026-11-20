import { fitLaunchLayout } from './launch-layout';

describe('Measured square-game allocation without page scroll', () => {
  it.each([
    [296, 396, 90], // Compact portrait
    [296, 456, 134], // 320 x 480
    [296, 544, 142],
    [366, 626, 144],
    [366, 820, 160],
    [744, 1000, 210],
    [1100, 744, 210],
    [1100, 876, 220],
    [1100, 1056, 220],
    [516, 396, 110],
    [544, 296, 110], // Landscape phones
    [820, 366, 145],
    [616, 336, 130],
  ])(
    'allocates equal game edges inside %s x %s with a %s px intro',
    (width, height, introHeight) => {
      const gap = 12,
        footerHeight = 44;
      const frame = fitLaunchLayout({ width, height, introHeight, gap, footerHeight });
      expect(frame.size).toBeGreaterThanOrEqual(220);
      expect(frame.size).toBeLessThanOrEqual(width);
      expect(frame.stageWidth).toBe(frame.size);
      if (frame.wide) {
        expect(frame.size * 2 + gap).toBeLessThanOrEqual(width);
        expect(frame.size + footerHeight + gap).toBeLessThanOrEqual(height);
      } else {
        expect(frame.size + introHeight + footerHeight + gap * 2).toBeLessThanOrEqual(height);
      }
    },
  );
  it('adapts when font loading changes the real header height without changing game proportions', () => {
    const input = { width: 366, height: 626, introHeight: 144, footerHeight: 44, gap: 12 };
    const initial = fitLaunchLayout(input);
    const largerText = fitLaunchLayout({ ...input, introHeight: 260 });
    expect(largerText.size).toBeLessThan(initial.size);
    expect(largerText.size + 260 + 44 + 24).toBeLessThanOrEqual(626);
  });
  it.each([
    [1100, 744],
    [1100, 480],
  ])('widens only opted-in desktop frames within %s x %s', (width, height) => {
    const input = { width, height, introHeight: 210, footerHeight: 44, gap: 12 };
    const original = fitLaunchLayout(input);
    const desktop = fitLaunchLayout({ ...input, desktop: true });
    expect(desktop.size).toBe(original.size);
    expect(desktop.stageWidth).toBeGreaterThan(desktop.size);
    expect(desktop.stageWidth).toBeLessThanOrEqual(desktop.size * 1.3);
    expect(desktop.stageWidth).toBeLessThanOrEqual(desktop.wide ? (width - 12) / 2 : width);
  });
});
