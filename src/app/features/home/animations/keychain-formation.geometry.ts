import { type RouteRect } from './keychain-route.geometry';

/** Complete compact travel bounds, including the inner float and rotation allowance. */
export interface FormationMember {
  readonly id: string;
  readonly width: number;
  readonly height: number;
}

export interface KeychainFormation {
  readonly valid: boolean;
  readonly slots: readonly { readonly id: string; readonly x: number; readonly y: number }[];
  /** Additional uniform scale applied to members and gaps; never enlarges the travel pose. */
  readonly scale: number;
  readonly width: number;
  readonly height: number;
  readonly issues: readonly string[];
}

export interface KeychainFormationOptions {
  readonly clearance: number;
  readonly gap: number;
}

const positive = (value: number): boolean => Number.isFinite(value) && value > 0;
const nonnegative = (value: number): boolean => Number.isFinite(value) && value >= 0;
const invalid = (issues: readonly string[]): KeychainFormation => ({
  valid: false,
  slots: [],
  scale: 0,
  width: 0,
  height: 0,
  issues,
});

/** Fit a single centered row inside the measured safe area, preserving asset order and proportions. */
export function buildKeychainFormation(
  area: RouteRect,
  members: readonly FormationMember[],
  options: KeychainFormationOptions,
): KeychainFormation {
  const issues: string[] = [];
  if (
    !area ||
    !Number.isFinite(area.left) ||
    !Number.isFinite(area.top) ||
    !positive(area.width) ||
    !positive(area.height) ||
    !Number.isFinite(area.left + area.width) ||
    !Number.isFinite(area.top + area.height)
  ) {
    issues.push('invalid-area');
  }
  if (!options || !nonnegative(options.clearance) || !nonnegative(options.gap)) {
    issues.push('invalid-options');
  }
  if (!Array.isArray(members) || members.length === 0) {
    issues.push('empty-members');
  } else {
    const ids = new Set<string>();
    for (const member of members) {
      if (
        !member ||
        typeof member.id !== 'string' ||
        member.id.trim().length === 0 ||
        !positive(member.width) ||
        !positive(member.height)
      ) {
        issues.push('invalid-member');
        continue;
      }
      if (ids.has(member.id)) issues.push('duplicate-member-id');
      ids.add(member.id);
    }
  }
  if (issues.length) return invalid(issues);

  const usableWidth = area.width - options.clearance * 2;
  const usableHeight = area.height - options.clearance * 2;
  const naturalWidth =
    members.reduce((sum, member) => sum + member.width, 0) + options.gap * (members.length - 1);
  const naturalHeight = members.reduce((height, member) => Math.max(height, member.height), 0);
  if (![usableWidth, usableHeight, naturalWidth, naturalHeight].every(positive)) {
    return invalid(['insufficient-or-nonfinite-space']);
  }

  const scale = Math.min(1, usableWidth / naturalWidth, usableHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  if (![scale, width, height].every(positive)) return invalid(['nonfinite-formation']);

  let cursor = area.left + (area.width - width) / 2;
  const y = area.top + area.height / 2;
  const slots = members.map((member) => {
    const memberWidth = member.width * scale;
    const x = cursor + memberWidth / 2;
    cursor += memberWidth + options.gap * scale;
    return { id: member.id, x, y };
  });
  if (slots.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
    return invalid(['nonfinite-slots']);
  }
  return { valid: true, slots, scale, width, height, issues: [] };
}
