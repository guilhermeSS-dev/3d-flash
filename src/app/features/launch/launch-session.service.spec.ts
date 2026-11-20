import { LaunchClock } from './launch-clock';
import { TestBed } from '@angular/core/testing';
import { launchConfig } from '../../core/config/launch.config';
import { LAUNCH_CONFIG, LaunchSessionService } from './launch-session.service';
// Legacy UI scenarios use a deterministic clock; trusted-clock behavior is tested separately.
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: LaunchClock,
        useValue: {
          now: () => Date.now(),
          target: null,
          sync: async () => true,
          cancel: () => {},
        },
      },
    ],
  });
});
describe('Launch gate preserves mounted home components', () => {
  afterEach(() => vi.restoreAllMocks());
  function setup(enabled: boolean, now: string) {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(now));
    TestBed.configureTestingModule({
      providers: [{ provide: LAUNCH_CONFIG, useValue: { ...launchConfig, enabled } }],
    });
    return TestBed.inject(LaunchSessionService);
  }
  it('defers callbacks until reveal and cancels destroyed components', () => {
    const gate = setup(true, '2030-12-01T22:00:00Z');
    const initialize = vi.fn(),
      removed = vi.fn();
    gate.whenReady(initialize);
    gate.whenReady(removed)();
    expect(gate.active()).toBe(true);
    expect(initialize).not.toHaveBeenCalled();
    gate.reveal();
    gate.reveal();
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();
    expect(gate.active()).toBe(false);
  });
  it.each([false, true])('mounts normal home immediately after release, enabled=%s', (enabled) => {
    const gate = setup(enabled, '2030-12-01T23:00:01Z');
    const init = vi.fn();
    gate.whenReady(init);
    expect(gate.active()).toBe(false);
    expect(init).toHaveBeenCalledTimes(1);
  });
  it('supports explicit campaign disablement before the example launch', () => {
    const gate = setup(false, '2030-12-01T22:00:00Z');
    expect(gate.active()).toBe(false);
  });
});

describe('Prepared landing remains protected until pixel reveal ends', () => {
  afterEach(() => vi.restoreAllMocks());
  it('starts landing resources only at launch preparation without unlocking background focus early', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2030-12-01T22:00:00Z'));
    TestBed.configureTestingModule({
      providers: [{ provide: LAUNCH_CONFIG, useValue: { ...launchConfig, enabled: true } }],
    });
    const gate = TestBed.inject(LaunchSessionService),
      first = vi.fn(),
      late = vi.fn();
    gate.whenReady(first);
    gate.prepareLanding();
    gate.prepareLanding();
    expect(first).toHaveBeenCalledTimes(1);
    expect(gate.active()).toBe(true);
    gate.whenReady(late);
    expect(late).toHaveBeenCalledTimes(1);
    gate.reveal();
    expect(gate.active()).toBe(false);
  });
});
