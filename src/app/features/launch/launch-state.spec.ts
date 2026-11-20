import { award, launchInstant, readReward, remaining, saveReward } from './launch-state';
describe('Launch clock and persistent rewards', () => {
  it('requires an explicit offset and valid IANA zone', () => {
    expect(launchInstant('2030-12-01T20:00:00-03:00', 'America/Sao_Paulo')).toBe(
      Date.parse('2030-12-01T23:00:00Z'),
    );
    expect(launchInstant('2030-12-01T20:00:00', 'America/Sao_Paulo')).toBeNull();
    expect(launchInstant('2030-12-01T20:00:00Z', 'invalid')).toBeNull();
  });
  it('derives rollovers from wall time without interval drift', () => {
    expect(remaining(90061000, 0)).toEqual([1, 1, 1, 1]);
    expect(remaining(60000, 1000)).toEqual([0, 0, 0, 59]);
    expect(remaining(1000, 2000)).toEqual([0, 0, 0, 0]);
  });
  it('keeps best per run and grants once without revoking on a later threshold increase', () => {
    let state = { best: 4, unlocked: false, announced: false };
    const first = award(state, 7, 7);
    expect(first.celebrate).toBe(true);
    state = first.reward;
    expect(award(state, 5, 7).reward.best).toBe(7);
    expect(award(state, 8, 7).celebrate).toBe(false);
    expect(award(state, 0, 20).reward.unlocked).toBe(true);
  });
  it('survives unavailable or corrupted localStorage', () => {
    expect(readReward({ getItem: () => '{' }).best).toBe(0);
    expect(
      readReward({
        getItem: () => {
          throw Error();
        },
      }).unlocked,
    ).toBe(false);
    expect(() =>
      saveReward(
        {
          setItem: () => {
            throw Error();
          },
        },
        { best: 7, unlocked: true, announced: true },
      ),
    ).not.toThrow();
  });
});

describe('Reward settings and configuration edges', () => {
  it('rejects impossible calendar dates and accepts leap days', () => {
    expect(launchInstant('2030-02-30T20:00:00-03:00', 'America/Sao_Paulo')).toBeNull();
    expect(launchInstant('2032-02-29T20:00:00-03:00', 'America/Sao_Paulo')).not.toBeNull();
    expect(launchInstant('2030-12-01T24:00:00-03:00', 'America/Sao_Paulo')).toBeNull();
  });
  it('recovers a best score without summing runs and supports changed thresholds', () => {
    const storage = {
      getItem: () => JSON.stringify({ best: 5, unlocked: false, announced: false }),
    };
    expect(readReward(storage, { storageKey: 'test', VIP_REWARD_THRESHOLD: 4 }).unlocked).toBe(
      true,
    );
    expect(readReward(storage, { storageKey: 'test', VIP_REWARD_THRESHOLD: 8 }).unlocked).toBe(
      false,
    );
    const writes = vi.fn();
    saveReward({ setItem: writes }, { best: 8, unlocked: true, announced: true }, 'test');
    expect(writes).toHaveBeenCalledWith(
      'test',
      JSON.stringify({ best: 8, unlocked: true, announced: true }),
    );
    expect(award({ best: 8, unlocked: true, announced: true }, 3, 9).reward.best).toBe(8);
  });
});

describe('Countdown boundary cases', () => {
  it('computes exact minute, hour and day rollovers and clamps after launch', () => {
    expect(remaining(86400000, 0)).toEqual([1, 0, 0, 0]);
    expect(remaining(86400000, 1000)).toEqual([0, 23, 59, 59]);
    expect(remaining(3600000, 1000)).toEqual([0, 0, 59, 59]);
    expect(remaining(1000, 999)).toEqual([0, 0, 0, 1]);
    expect(remaining(1000, 1000)).toEqual([0, 0, 0, 0]);
  });
  it('resolves equivalent explicit instants independently of the visitor locale', () => {
    expect(launchInstant('2030-12-01T20:00:00-03:00', 'America/Sao_Paulo')).toBe(
      launchInstant('2030-12-01T23:00:00Z', 'UTC'),
    );
    expect(launchInstant('2030-12-02T04:45:00+05:45', 'Asia/Kathmandu')).toBe(
      Date.parse('2030-12-01T23:00:00Z'),
    );
  });
});
