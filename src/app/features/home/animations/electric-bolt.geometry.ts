import { type RoutePosition } from './keychain-route.geometry';

export interface ElectricBoltOptions {
  readonly seed: number;
  /** Maximum end-to-end span. Angular detours do not form a persistent trail. */
  readonly maxLength: number;
  readonly amplitude: number;
}

export interface ElectricBolt {
  readonly valid: boolean;
  readonly path: string;
  readonly branches: readonly string[];
  readonly points: readonly RoutePosition[];
}

const empty = (): ElectricBolt => ({ valid: false, path: '', branches: [], points: [] });
const finitePoint = (point: RoutePosition): boolean =>
  !!point && Number.isFinite(point.x) && Number.isFinite(point.y);

/** A local seeded generator keeps geometry reproducible without changing global randomness. */
function randomFor(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function asPath(points: readonly RoutePosition[]): string {
  const coordinate = (value: number): string => String(Number(value.toFixed(3)));
  return points
    .map((point, index) => `${index ? 'L' : 'M'}${coordinate(point.x)} ${coordinate(point.y)}`)
    .join(' ');
}

/** Build one short, irregular angular discharge aligned with the measured movement direction. */
export function buildElectricBolt(
  from: RoutePosition,
  to: RoutePosition,
  options: ElectricBoltOptions,
): ElectricBolt {
  if (
    !finitePoint(from) ||
    !finitePoint(to) ||
    !options ||
    !Number.isFinite(options.seed) ||
    !Number.isFinite(options.maxLength) ||
    options.maxLength < 1 ||
    !Number.isFinite(options.amplitude) ||
    options.amplitude <= 0
  ) {
    return empty();
  }

  const delta = { x: to.x - from.x, y: to.y - from.y };
  const distance = Math.hypot(delta.x, delta.y);
  if (!Number.isFinite(distance) || distance < 1) return empty();
  const length = Math.min(distance, options.maxLength);
  const direction = { x: delta.x / distance, y: delta.y / distance };
  const normal = { x: -direction.y, y: direction.x };
  const amplitude = Math.min(options.amplitude, length * 0.28);
  const start = { x: to.x - direction.x * length, y: to.y - direction.y * length };
  const random = randomFor(options.seed);
  const count = 6 + Math.floor(random() * 4);
  const phase = random() < 0.5 ? -1 : 1;
  const local: { along: number; across: number }[] = [{ along: 0, across: 0 }];
  for (let index = 1; index < count - 1; index++) {
    local.push({
      along: (length * (index + (random() - 0.5) * 0.38)) / (count - 1),
      across: phase * (index % 2 ? 1 : -1) * amplitude * (0.45 + random() * 0.55),
    });
  }
  local.push({ along: length, across: 0 });

  const project = ({ along, across }: { along: number; across: number }): RoutePosition => ({
    x: start.x + direction.x * along + normal.x * across,
    y: start.y + direction.y * along + normal.y * across,
  });
  const points = local.map(project);
  // Keep the exact attachment position; do not leave a rounding seam at the moving object.
  points[points.length - 1] = { x: to.x, y: to.y };
  const branchCount = 1 + Math.floor(random() * 2);
  const branches: RoutePosition[][] = [];
  const used = new Set<number>();
  for (let index = 0; index < branchCount; index++) {
    let joint = 1 + Math.floor(random() * (count - 3));
    if (used.has(joint)) joint = 1 + (joint % (count - 3));
    used.add(joint);
    const origin = local[joint];
    const side = origin.across >= 0 ? 1 : -1;
    const advance = Math.min(length * (0.08 + random() * 0.04), (length - origin.along) * 0.4);
    branches.push(
      [
        origin,
        { along: origin.along + advance * 0.45, across: side * amplitude },
        { along: origin.along + advance, across: side * amplitude * (0.58 + random() * 0.22) },
      ].map(project),
    );
  }
  if (
    !points.every(finitePoint) ||
    branches.some((branch) => !branch.every(finitePoint)) ||
    Math.hypot(to.x - points[0].x, to.y - points[0].y) < 1
  ) {
    return empty();
  }
  return { valid: true, path: asPath(points), branches: branches.map(asPath), points };
}
