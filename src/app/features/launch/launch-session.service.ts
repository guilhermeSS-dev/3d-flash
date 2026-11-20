import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { launchConfig, type LaunchConfig } from '../../core/config/launch.config';
import { LaunchClock } from './launch-clock';
import { launchInstant } from './launch-state';

export const LAUNCH_CONFIG = new InjectionToken<LaunchConfig>('Launch configuration', {
  providedIn: 'root',
  factory: () => launchConfig,
});
@Injectable({ providedIn: 'root' })
export class LaunchSessionService {
  readonly config = inject(LAUNCH_CONFIG);
  readonly clock = inject(LaunchClock);
  private readonly configuredInstant = launchInstant(this.config.launchAt, this.config.timeZone);
  get instant(): number | null {
    return this.configuredInstant;
  }
  readonly active = signal(
    this.config.enabled &&
      this.instant !== null &&
      (this.clock.now() === null || this.clock.now()! < this.instant),
  );
  private waiting = new Set<() => void>();
  private prepared = false;

  whenReady(callback: () => void): () => void {
    if (!this.active() || this.prepared) {
      callback();
      return () => {};
    }
    this.waiting.add(callback);
    return () => {
      this.waiting.delete(callback);
    };
  }
  reveal(): void {
    if (!this.active()) return;
    this.prepareLanding();
    this.active.set(false);
  }
  prepareLanding(): void {
    if (this.prepared) return;
    this.prepared = true;
    const callbacks = [...this.waiting];
    this.waiting.clear();
    callbacks.forEach((callback) => callback());
  }
}
