import { launchConfig } from '../../core/config/launch.config';
import { VipPickup, WHATSAPP_PIXELS, WHATSAPP_PIXEL_PATH } from './vip-pickup';

describe('Mandatory VIP pickup follows the real player', () => {
  it.each([30, 60, 120])('contacts a jumping or standing player at %s fps', (fps) => {
    for (const jumping of [false, true]) {
      const pickup = new VipPickup(launchConfig.vipPickup);
      pickup.start(900, 230);
      let contacted = false;
      for (let frame = 0; frame <= fps * 3; frame++) {
        const player = {
          x: 90,
          y: jumping ? 105 + Math.sin((frame / fps) * 9) * 60 : 171,
          width: 44,
          height: 59,
        };
        if (pickup.advance(1 / fps, player)) {
          contacted = true;
          expect(pickup.x).toBeLessThan(player.x + player.width);
          expect(pickup.x + pickup.settings.size).toBeGreaterThan(player.x);
          expect(pickup.y).toBeLessThan(player.y + player.height);
          expect(pickup.y + pickup.settings.size).toBeGreaterThan(player.y);
          break;
        }
      }
      expect(contacted).toBe(true);
      expect(pickup.active).toBe(false);
    }
  });
  it('supports narrow worlds and reduced motion without skipping the collection', () => {
    const pickup = new VipPickup(launchConfig.vipPickup);
    pickup.start(600, 230, true);
    let collected = false;
    for (let i = 0; i < 60; i++)
      collected = pickup.advance(1 / 60, { x: 90, y: 171, width: 44, height: 59 }) || collected;
    expect(collected).toBe(true);
    pickup.start(600, 230);
    pickup.cancel();
    expect(pickup.advance(1, { x: 90, y: 171, width: 44, height: 59 })).toBe(false);
  });
  it('uses a bounded 24px monochrome pixel icon, matching the game controls', () => {
    expect(WHATSAPP_PIXELS).toHaveLength(24);
    expect(WHATSAPP_PIXELS.every((row) => row.length === 24 && /^[01]+$/.test(row))).toBe(true);
    expect(WHATSAPP_PIXEL_PATH).toContain('h1v1h-1Z');
  });
});
