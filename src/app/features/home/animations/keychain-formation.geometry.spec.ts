import { animationConfig } from '../../../core/config/animation.config';
import { siteAssets } from '../../../core/config/assets.config';
import { buildKeychainFormation, type FormationMember } from './keychain-formation.geometry';
import { type RouteRect } from './keychain-route.geometry';

/** The five available original aspect ratios, compacted into the configured travel envelope. */
function originalMembers(width: number): readonly FormationMember[] {
  const config = animationConfig.keychains;
  const footprintWidth = Math.min(
    config.routeWidthMaxPx,
    Math.max(config.routeWidthMinPx, width * config.routeWidthRatio),
  );
  const footprintHeight = footprintWidth * config.routeHeightRatio + config.floatDistancePx * 2;
  const angle = (config.floatRotationDegrees * Math.PI) / 180;
  return siteAssets.keychains
    .filter((asset) => asset.renderAllowed)
    .map((asset) => {
      const sourceWidth = 60;
      const sourceHeight = (sourceWidth * asset.bounds.height) / asset.bounds.width;
      const bounds = {
        width: sourceWidth * Math.cos(angle) + sourceHeight * Math.sin(angle),
        height:
          sourceHeight * Math.cos(angle) +
          sourceWidth * Math.sin(angle) +
          config.floatDistancePx * 2,
      };
      const scale = Math.min(1, footprintWidth / bounds.width, footprintHeight / bounds.height);
      return { id: asset.id, width: bounds.width * scale, height: bounds.height * scale };
    });
}

describe('Measured keychain horizontal formation', () => {
  it.each([320, 390, 768, 1024, 1440])(
    'aligns the five original proportions inside the safe area at %ipx without enlarging them',
    (width) => {
      const members = originalMembers(width);
      const area = { left: 40, top: 1400, width: width - 80, height: 150 };
      const row = buildKeychainFormation(area, members, { clearance: 8, gap: 8 });
      expect(row.valid).toBe(true);
      expect(row.issues).toEqual([]);
      expect(row.scale).toBe(1);
      expect(row.slots.map(({ id }) => id)).toEqual(members.map(({ id }) => id));
      expect(row.slots).toHaveLength(5);
      const left = row.slots[0].x - (members[0].width * row.scale) / 2;
      const last = members.length - 1;
      const right = row.slots[last].x + (members[last].width * row.scale) / 2;
      expect((left + right) / 2).toBeCloseTo(area.left + area.width / 2, 8);
      expect(right - left).toBeCloseTo(row.width, 8);

      row.slots.forEach((slot, index) => {
        const member = members[index];
        expect(slot.y).toBe(area.top + area.height / 2);
        expect(slot.x - (member.width * row.scale) / 2).toBeGreaterThanOrEqual(area.left + 8);
        expect(slot.x + (member.width * row.scale) / 2).toBeLessThanOrEqual(
          area.left + area.width - 8,
        );
        expect(slot.y - (member.height * row.scale) / 2).toBeGreaterThanOrEqual(area.top + 8);
        expect(slot.y + (member.height * row.scale) / 2).toBeLessThanOrEqual(
          area.top + area.height - 8,
        );
        if (index) {
          const previous = members[index - 1];
          const gap =
            slot.x -
            (member.width * row.scale) / 2 -
            (row.slots[index - 1].x + (previous.width * row.scale) / 2);
          expect(gap).toBeCloseTo(8 * row.scale, 8);
        }
      });
    },
  );

  it('shrinks members and gaps together when the measured width or height is constrained', () => {
    const members = originalMembers(1440);
    for (const area of [
      { left: 30, top: 800, width: 100, height: 140 },
      { left: 30, top: 800, width: 500, height: 40 },
    ]) {
      const row = buildKeychainFormation(area, members, { clearance: 8, gap: 10 });
      expect(row.valid).toBe(true);
      expect(row.scale).toBeGreaterThan(0);
      expect(row.scale).toBeLessThan(1);
      expect(row.width).toBeLessThanOrEqual(area.width - 16 + 1e-8);
      expect(row.height).toBeLessThanOrEqual(area.height - 16 + 1e-8);
      const firstLeft = row.slots[0].x - (members[0].width * row.scale) / 2;
      const last = members.length - 1;
      const lastRight = row.slots[last].x + (members[last].width * row.scale) / 2;
      expect(firstLeft).toBeGreaterThanOrEqual(area.left + 8 - 1e-8);
      expect(lastRight).toBeLessThanOrEqual(area.left + area.width - 8 + 1e-8);
      expect(row.slots.map(({ y }) => y)).toEqual(members.map(() => area.top + area.height / 2));
    }
  });

  it('centers a single member and preserves stable ID order without mutating inputs', () => {
    const area = Object.freeze({ left: -20, top: 900, width: 300, height: 120 });
    const members = Object.freeze([
      Object.freeze({ id: 'later', width: 30, height: 70 }),
      Object.freeze({ id: 'earlier', width: 50, height: 60 }),
    ]);
    const options = Object.freeze({ clearance: 8, gap: 12 });
    const first = buildKeychainFormation(area, members, options);
    expect(first.slots.map(({ id }) => id)).toEqual(['later', 'earlier']);
    expect(buildKeychainFormation(area, members, options)).toEqual(first);
    const single = buildKeychainFormation(area, [members[1]], options);
    expect(single.slots).toEqual([{ id: 'earlier', x: 130, y: 960 }]);
    expect(single.width).toBe(50);
    expect(single.height).toBe(60);
    expect(single.scale).toBe(1);
  });

  it('rejects malformed geometry and IDs with finite empty fallback output', () => {
    const area: RouteRect = { left: 0, top: 500, width: 250, height: 120 };
    const member = { id: 'a', width: 30, height: 70 };
    const options = { clearance: 8, gap: 10 };
    const cases = [
      buildKeychainFormation({ ...area, left: NaN }, [member], options),
      buildKeychainFormation({ ...area, top: Infinity }, [member], options),
      buildKeychainFormation({ ...area, width: 0 }, [member], options),
      buildKeychainFormation({ ...area, height: -1 }, [member], options),
      buildKeychainFormation(
        { ...area, left: Number.MAX_VALUE, width: Number.MAX_VALUE },
        [member],
        options,
      ),
      buildKeychainFormation(area, [], options),
      buildKeychainFormation(area, [member, member], options),
      buildKeychainFormation(area, [{ ...member, id: ' ' }], options),
      buildKeychainFormation(area, [{ ...member, width: NaN }], options),
      buildKeychainFormation(area, [{ ...member, height: -5 }], options),
      buildKeychainFormation(area, [member], { ...options, gap: Infinity }),
      buildKeychainFormation(area, [member], { ...options, clearance: -1 }),
      buildKeychainFormation(area, [member], { ...options, clearance: 70 }),
      buildKeychainFormation(area, [member], { ...options, gap: -1 }),
      buildKeychainFormation(
        area,
        [
          { ...member, width: Number.MAX_VALUE },
          { ...member, id: 'b', width: Number.MAX_VALUE },
        ],
        options,
      ),
    ];
    for (const result of cases) {
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.slots).toEqual([]);
      expect(result.scale).toBe(0);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    }
  });
});
