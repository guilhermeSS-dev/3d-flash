import { launchConfig, type LaunchConfig } from '../../core/config/launch.config';

/** A single SVG clip path: full rows below the frontier, individual pixels only on its edge. */
export function createPixelReveal(
  width: number,
  height: number,
  settings: LaunchConfig['reveal'] = launchConfig.reveal,
): (progress: number) => string {
  if (![width, height].every((value) => Number.isFinite(value) && value > 0)) return () => '';
  const tile = Math.max(settings.minTilePx, width / settings.columns);
  const rows = Math.ceil(height / tile);
  const columns = Math.ceil(width / tile);
  const rectangle = (x: number, y: number, w: number, h: number) =>
    'M' + x + ' ' + y + 'h' + w + 'v' + h + 'h-' + w + 'Z';
  const buckets = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => ({
      threshold: row + (((row * 197 + column * 73 + 17) % 97) / 97) * settings.frontierRows,
      path: rectangle(
        column * tile,
        row * tile,
        Math.min(tile + 0.3, width - column * tile),
        Math.min(tile + 0.3, height - row * tile),
      ),
    })),
  );
  return (progress) => {
    if (progress <= 0) return rectangle(0, 0, width, height);
    if (progress >= 1) return '';
    const cutoff = progress * (rows + settings.frontierRows);
    const start = Math.max(0, Math.floor(cutoff - settings.frontierRows));
    const end = Math.min(rows, Math.ceil(cutoff));
    const parts: string[] = [];
    for (let row = start; row < end; row++)
      for (const cell of buckets[row]) if (cell.threshold > cutoff) parts.push(cell.path);
    if (end < rows) parts.push(rectangle(0, end * tile, width, height - end * tile));
    return parts.join(' ');
  };
}

/** Three short, staggered bands of falling tiles. Geometry is prepared once, not DOM per tile. */
export function createPixelLayers(
  width: number,
  height: number,
  settings: LaunchConfig['reveal'] = launchConfig.reveal,
): (progress: number) => string[] {
  if (width <= 0 || height <= 0) return () => ['', '', ''];
  const tile = Math.max(settings.minTilePx, width / settings.columns);
  const rows = Math.ceil(height / tile),
    columns = Math.ceil(width / tile);
  const tiles = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, col) => ({
      row,
      col,
      layer: (row * 7 + col * 3 + (col % 3)) % 3,
      threshold: row + (((row * 197 + col * 73 + 17) % 97) / 97) * settings.frontierRows,
    })),
  );
  return (progress) => {
    if (progress <= 0 || progress >= 1) return ['', '', ''];
    const cutoff = progress * (rows + settings.frontierRows);
    const paths = ['', '', ''];
    const first = Math.max(0, Math.floor(cutoff - settings.frontierRows - 7));
    const last = Math.min(rows, Math.ceil(cutoff));
    for (let row = first; row < last; row++)
      for (const cell of tiles[row]) {
        const age = cutoff - cell.threshold;
        const life = 2 + cell.layer * 1.5;
        if (age < 0 || age > life) continue;
        const size = tile * (1 - age / life) * (0.7 + cell.layer * 0.1);
        if (size < 0.3) continue;
        const x = cell.col * tile + (tile - size) / 2;
        const y = cell.row * tile + age * tile * (1 + cell.layer * 0.45);
        paths[cell.layer] +=
          'M' +
          x.toFixed(1) +
          ' ' +
          y.toFixed(1) +
          'h' +
          size.toFixed(1) +
          'v' +
          size.toFixed(1) +
          'h-' +
          size.toFixed(1) +
          'Z';
      }
    return paths;
  };
}
