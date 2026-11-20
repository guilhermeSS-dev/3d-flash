import { LaunchClock, timeApiEpoch } from './launch-clock';
import { launchConfig } from '../../core/config/launch.config';

const payload = {
  year: 2026,
  month: 11,
  day: 20,
  hour: 15,
  minute: 30,
  seconds: 10,
  milliSeconds: 125,
  timeZone: 'Etc/UTC',
};
const epoch = Date.UTC(2026, 10, 20, 15, 30, 10, 125);

describe('External UTC clock with device fallback', () => {
  let elapsed: number;
  beforeEach(() => {
    elapsed = 10;
    vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  function transport(data: unknown = payload, ok = true) {
    const fetcher = vi.fn(async () => ({ ok, json: async () => data }));
    vi.stubGlobal('fetch', fetcher);
    return fetcher;
  }
  it('uses API UTC and ignores later changes to the device wall clock', async () => {
    const fetcher = transport();
    const clock = new LaunchClock();
    expect(clock.now()).toBeNull();
    expect(await clock.sync()).toBe(true);
    vi.spyOn(Date, 'now').mockReturnValue(9999999999999);
    elapsed += 1200;
    expect(clock.now()).toBe(epoch + 1200);
    expect(clock.source).toBe('api');
    expect(fetcher).toHaveBeenCalledWith(
      launchConfig.timeSource.url,
      expect.objectContaining({ cache: 'no-store', credentials: 'omit' }),
    );
  });
  it('deduplicates concurrent synchronization and expires old anchors', async () => {
    const fetcher = transport();
    const clock = new LaunchClock();
    await Promise.all([clock.sync(), clock.sync()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    elapsed += launchConfig.timeSource.maxAgeMs + 1;
    expect(clock.now()).toBeNull();
  });
  it.each(['network', 'http', 'payload'])(
    'falls back on %s failure and recovers on a later API success',
    async (failure) => {
      vi.spyOn(Date, 'now').mockReturnValue(123456789);
      if (failure === 'network')
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
      else transport(failure === 'payload' ? {} : payload, failure !== 'http');
      const clock = new LaunchClock();
      expect(await clock.sync()).toBe(true);
      expect(clock.source).toBe('device');
      elapsed += 500;
      expect(clock.now()).toBe(123457289);
      transport();
      await clock.sync();
      expect(clock.source).toBe('api');
      expect(clock.now()).toBe(epoch);
    },
  );
  it.each([
    {},
    null,
    { ...payload, timeZone: 'America/Sao_Paulo' },
    { ...payload, month: 13 },
    { ...payload, day: 31 },
    { ...payload, seconds: 60 },
    { ...payload, hour: '15' },
  ])('rejects malformed or non-UTC responses: %j', (value) => {
    expect(timeApiEpoch(value)).toBeNull();
  });
  it('accepts UTC fields without parsing a date in the local timezone', () => {
    expect(timeApiEpoch(payload)).toBe(epoch);
  });
  function hangingTransport() {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
              once: true,
            });
          }),
      ),
    );
  }
  it('uses the fallback on timeout and removes its timer', async () => {
    vi.useFakeTimers();
    hangingTransport();
    vi.spyOn(Date, 'now').mockReturnValue(12345);
    const clock = new LaunchClock();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const pending = clock.sync();
    await vi.advanceTimersByTimeAsync(launchConfig.timeSource.timeoutMs);
    expect(await pending).toBe(true);
    expect(clock.now()).toBe(12345);
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
  it('cancels pending work on teardown without creating a fallback', async () => {
    vi.useFakeTimers();
    hangingTransport();
    const clock = new LaunchClock();
    const pending = clock.sync();
    clock.cancel();
    expect(await pending).toBe(false);
    expect(clock.now()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
