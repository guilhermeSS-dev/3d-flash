import { type LaunchConfig } from '../../core/config/launch.config';

export const WHATSAPP_PIXELS = [
  '000000111111111100000000',
  '000011111111111111000000',
  '000111000000000011100000',
  '001110000000000001110000',
  '011100000000000000111000',
  '011000000000000000011000',
  '110000110000000000001100',
  '110001111000000000001100',
  '110001111000000000001100',
  '110001110000000000001100',
  '110000110000000000001100',
  '110000111000000000001100',
  '110000011100011100001100',
  '110000001110111110001100',
  '011000000111111100011000',
  '011100000011110000111000',
  '001100000000000000110000',
  '001100000000000001110000',
  '001100110000000011100000',
  '011111111111111111000000',
  '011111001111111100000000',
  '111100000000000000000000',
  '110000000000000000000000',
  '000000000000000000000000',
] as const;

export const WHATSAPP_PIXEL_PATH = WHATSAPP_PIXELS.flatMap((row, y) =>
  [...row].flatMap((pixel, x) => (pixel === '1' ? ['M' + x + ' ' + y + 'h1v1h-1Z'] : [])),
).join('');

/** This actor follows the live player, independently of obstacles, FPS and jump height. */
export class VipPickup {
  active = false;
  x = 0;
  y = 0;
  private elapsed = 0;
  private origin = { x: 0, y: 0 };
  private duration = 1;
  private amplitude = 0;
  constructor(readonly settings: LaunchConfig['vipPickup']) {}
  start(width: number, ground: number, reduced = false): void {
    this.active = true;
    this.elapsed = 0;
    this.duration = reduced ? this.settings.reducedFlightSeconds : this.settings.flightSeconds;
    this.amplitude = reduced ? 0 : this.settings.floatAmplitude;
    this.origin = { x: width - this.settings.size - 18, y: ground * 0.35 };
    this.x = this.origin.x;
    this.y = this.origin.y;
  }
  cancel(): void {
    this.active = false;
  }
  advance(
    seconds: number,
    player: { x: number; y: number; width: number; height: number },
  ): boolean {
    if (!this.active || !Number.isFinite(seconds) || seconds < 0) return false;
    this.elapsed += Math.min(seconds, 0.1);
    const progress = Math.min(1, this.elapsed / Math.max(0.01, this.duration));
    const ease = progress * progress * (3 - 2 * progress);
    const size = this.settings.size;
    const targetX = player.x + (player.width - size) / 2;
    const targetY = player.y + (player.height - size) / 2;
    this.x = this.origin.x + (targetX - this.origin.x) * ease;
    this.y =
      this.origin.y +
      (targetY - this.origin.y) * ease +
      Math.sin(this.elapsed * this.settings.floatFrequency) * this.amplitude * (1 - progress);
    const touching =
      this.x < player.x + player.width &&
      this.x + size > player.x &&
      this.y < player.y + player.height &&
      this.y + size > player.y;
    if (touching || progress >= 1) {
      this.active = false;
      return true;
    }
    return false;
  }
}

export function makeWhatsappSprite(color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 24;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = color;
    WHATSAPP_PIXELS.forEach((row, y) =>
      [...row].forEach((pixel, x) => {
        if (pixel === '1') context.fillRect(x, y, 1, 1);
      }),
    );
  }
  return canvas;
}
