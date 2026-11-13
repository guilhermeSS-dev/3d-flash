import { buildElectricBolt, type ElectricBolt } from './electric-bolt.geometry';
import { type RoutePosition } from './keychain-route.geometry';

const options = { seed: 17, maxLength: 64, amplitude: 6 };

function branchPoints(bolt: ElectricBolt): RoutePosition[] {
  return bolt.branches.flatMap((path) => {
    const numbers = path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number) ?? [];
    return Array.from({ length: numbers.length / 2 }, (_, index) => ({
      x: numbers[index * 2],
      y: numbers[index * 2 + 1],
    }));
  });
}

describe('Short angular electrical discharge geometry', () => {
  it('produces an irregular zigzag with branches and no curve commands', () => {
    const bolt = buildElectricBolt({ x: 0, y: 0 }, { x: 64, y: 0 }, options);
    expect(bolt.valid).toBe(true);
    expect(bolt.points.length).toBeGreaterThanOrEqual(6);
    expect(bolt.points.length).toBeLessThanOrEqual(9);
    expect(bolt.path.startsWith('M')).toBe(true);
    expect(bolt.path.match(/L/g)).toHaveLength(bolt.points.length - 1);
    expect(bolt.path).not.toMatch(/[CQASTZ]/i);
    const interior = bolt.points.slice(1, -1);
    for (let index = 1; index < interior.length; index++) {
      expect(interior[index].y * interior[index - 1].y).toBeLessThan(0);
    }
    expect(new Set(interior.map(({ y }) => Math.abs(y).toFixed(3))).size).toBeGreaterThan(2);
    expect(bolt.branches.length).toBeGreaterThanOrEqual(1);
    expect(bolt.branches.length).toBeLessThanOrEqual(2);
    for (const branch of bolt.branches) {
      expect(branch.startsWith('M')).toBe(true);
      expect(branch.match(/L/g)).toHaveLength(2);
      expect(branch).not.toMatch(/[CQASTZ]/i);
    }
  });

  it.each([
    [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
    ],
    [
      { x: 1000, y: 0 },
      { x: 0, y: 0 },
    ],
    [
      { x: 4, y: 1000 },
      { x: 4, y: -1000 },
    ],
    [
      { x: 35, y: 90 },
      { x: -100, y: -110 },
    ],
  ])('clips a large movement to a short oriented segment from %o to %o', (from, to) => {
    const bolt = buildElectricBolt(from, to, options);
    expect(bolt.valid).toBe(true);
    expect(bolt.points.at(-1)).toEqual(to);
    const start = bolt.points[0];
    expect(Math.hypot(to.x - start.x, to.y - start.y)).toBeCloseTo(options.maxLength, 8);
    const delta = { x: to.x - from.x, y: to.y - from.y };
    const distance = Math.hypot(delta.x, delta.y);
    const unit = { x: delta.x / distance, y: delta.y / distance };
    const positions = [...bolt.points, ...branchPoints(bolt)];
    for (const point of positions) {
      const relative = { x: point.x - start.x, y: point.y - start.y };
      const along = relative.x * unit.x + relative.y * unit.y;
      const across = relative.x * -unit.y + relative.y * unit.x;
      // Branch path strings round to 0.001 px; main points retain full precision.
      expect(along).toBeGreaterThanOrEqual(-0.002);
      expect(along).toBeLessThanOrEqual(options.maxLength + 0.002);
      expect(Math.abs(across)).toBeLessThanOrEqual(options.amplitude + 0.002);
    }
  });

  it('does not amplify small travel and bounds disproportionate requested amplitudes', () => {
    const from = { x: 15, y: 25 };
    const to = { x: 20, y: 25 };
    const bolt = buildElectricBolt(from, to, { ...options, amplitude: 100 });
    expect(bolt.valid).toBe(true);
    expect(bolt.points[0]).toEqual(from);
    for (const point of [...bolt.points, ...branchPoints(bolt)]) {
      expect(point.x).toBeGreaterThanOrEqual(from.x - 0.001);
      expect(point.x).toBeLessThanOrEqual(to.x + 0.001);
      expect(Math.abs(point.y - from.y)).toBeLessThanOrEqual(5 * 0.28 + 0.001);
    }
  });

  it('is deterministic per seed, varies across seeds and never consumes global randomness', () => {
    const from = Object.freeze({ x: 10, y: 20 });
    const to = Object.freeze({ x: 60, y: 35 });
    const globalRandom = vi.spyOn(Math, 'random');
    try {
      const first = buildElectricBolt(from, to, options);
      expect(buildElectricBolt(from, to, options)).toEqual(first);
      expect(buildElectricBolt(from, to, { ...options, seed: 18 }).path).not.toBe(first.path);
      expect(globalRandom).not.toHaveBeenCalled();
    } finally {
      globalRandom.mockRestore();
    }
  });

  it('rejects stationary, subpixel or non-finite inputs with an empty finite fallback', () => {
    const from = { x: 10, y: 20 };
    const to = { x: 50, y: 30 };
    const invalid = [
      buildElectricBolt(from, from, options),
      buildElectricBolt(from, { x: 10.9, y: 20 }, options),
      buildElectricBolt({ x: NaN, y: 0 }, to, options),
      buildElectricBolt(from, { x: Infinity, y: 0 }, options),
      buildElectricBolt({ x: -Number.MAX_VALUE, y: 0 }, { x: Number.MAX_VALUE, y: 0 }, options),
      buildElectricBolt({ x: 1e100, y: 0 }, { x: 1.01e100, y: 0 }, options),
      buildElectricBolt(from, to, { ...options, seed: NaN }),
      buildElectricBolt(from, to, { ...options, maxLength: Infinity }),
      buildElectricBolt(from, to, { ...options, maxLength: 0.5 }),
      buildElectricBolt(from, to, { ...options, amplitude: 0 }),
      buildElectricBolt(from, to, { ...options, amplitude: -2 }),
      buildElectricBolt(from, to, { ...options, amplitude: NaN }),
    ];
    for (const bolt of invalid) {
      expect(bolt).toEqual({ valid: false, path: '', branches: [], points: [] });
    }
  });
});
