import { launchConfig as config, type LaunchConfig } from '../../core/config/launch.config';
export function launchInstant(value: string, zone: string): number | null {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: zone }).format();
    const fields = value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:Z|[+-]\d{2}:\d{2})$/,
    );
    if (!fields) return null;
    const [, year, month, day, hour, minute, second] = fields.map(Number);
    const calendar = new Date(Date.UTC(year, month - 1, day));
    if (
      calendar.getUTCFullYear() !== year ||
      calendar.getUTCMonth() !== month - 1 ||
      calendar.getUTCDate() !== day ||
      hour > 23 ||
      minute > 59 ||
      second > 59
    )
      return null;
    const instant = Date.parse(value);
    return Number.isFinite(instant) ? instant : null;
  } catch {
    return null;
  }
}
export function remaining(at: number, now: number) {
  const total = Math.max(0, Math.ceil((at - now) / 1000));
  return [
    Math.floor(total / 86400),
    Math.floor(total / 3600) % 24,
    Math.floor(total / 60) % 60,
    total % 60,
  ];
}
export interface Reward {
  best: number;
  unlocked: boolean;
  announced: boolean;
}
export function readReward(
  storage: Pick<Storage, 'getItem'> | undefined,
  settings: Pick<LaunchConfig, 'storageKey' | 'VIP_REWARD_THRESHOLD'> = config,
): Reward {
  try {
    const raw: unknown = JSON.parse(storage?.getItem(settings.storageKey) || '{}');
    const value = raw as Partial<Reward>;
    const best =
      Number.isSafeInteger(value?.best) && Number(value.best) >= 0 ? Number(value.best) : 0;
    return {
      best,
      unlocked: value?.unlocked === true || best >= settings.VIP_REWARD_THRESHOLD,
      announced: value?.announced === true,
    };
  } catch {
    return { best: 0, unlocked: false, announced: false };
  }
}
export function award(
  previous: Reward,
  score: number,
  threshold: number,
): { reward: Reward; celebrate: boolean } {
  const best = Math.max(previous.best, score);
  const unlocked = previous.unlocked || best >= threshold;
  const celebrate = unlocked && !previous.announced;
  return { reward: { best, unlocked, announced: previous.announced || celebrate }, celebrate };
}
export function saveReward(
  storage: Pick<Storage, 'setItem'> | undefined,
  reward: Reward,
  key: string = config.storageKey,
): void {
  try {
    storage?.setItem(key, JSON.stringify(reward));
  } catch {
    /* Keep in-memory play available. */
  }
}
