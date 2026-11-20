import { Injectable } from '@angular/core';
import { launchConfig } from '../../core/config/launch.config';

/** External UTC reference + monotonic elapsed time; device time is an offline fallback. */
@Injectable({ providedIn: 'root' })
export class LaunchClock {
  private controller: AbortController | undefined;
  private readonly cancelled = new WeakSet<AbortController>();
  private epoch: number | null = null;
  private anchor = 0;
  private pending: Promise<boolean> | undefined;
  private readonly settings = launchConfig.timeSource;
  source: 'api' | 'device' | null = null;

  now(): number | null {
    const elapsed = performance.now() - this.anchor;
    return this.epoch === null || elapsed < 0 || elapsed > this.settings.maxAgeMs
      ? null
      : this.epoch + elapsed;
  }
  cancel(): void {
    if (this.controller) {
      this.cancelled.add(this.controller);
      this.controller.abort();
    }
  }
  sync(): Promise<boolean> {
    if (this.pending) return this.pending;
    this.pending = this.request().finally(() => {
      this.pending = undefined;
    });
    return this.pending;
  }
  private async request(): Promise<boolean> {
    const controller = new AbortController();
    this.controller = controller;
    const timeout = setTimeout(() => controller.abort(), this.settings.timeoutMs);
    const start = performance.now();
    try {
      const response = await fetch(this.settings.url, {
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Time API unavailable');
      const epoch = timeApiEpoch(await response.json());
      const received = performance.now();
      if (epoch === null || controller.signal.aborted || received - start > this.settings.timeoutMs)
        throw new Error('Invalid time response');
      this.anchor = received;
      this.epoch = epoch;
      this.source = 'api';
      return true;
    } catch {
      if (this.cancelled.has(controller)) return false;
      // Requested fallback: an API outage must not block the countdown or reveal.
      this.epoch = Date.now();
      this.anchor = performance.now();
      this.source = 'device';
      return true;
    } finally {
      clearTimeout(timeout);
      if (this.controller === controller) this.controller = undefined;
    }
  }
}

/** The endpoint must return UTC; never interpret an offset-free date in the visitor's zone. */
export function timeApiEpoch(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as Record<string, unknown>;
  if (value['timeZone'] !== 'Etc/UTC' && value['timeZone'] !== 'UTC') return null;
  const fields = ['year', 'month', 'day', 'hour', 'minute', 'seconds', 'milliSeconds'] as const;
  const parts = fields.map((key) => value[key]);
  if (!parts.every((part) => typeof part === 'number' && Number.isInteger(part))) return null;
  const [year, month, day, hour, minute, second, ms] = parts as number[];
  if (year < 2000 || year > 9999) return null;
  const epoch = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const date = new Date(epoch);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second &&
    date.getUTCMilliseconds() === ms
    ? epoch
    : null;
}
