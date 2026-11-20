import { launchConfig } from '../../core/config/launch.config';
import { RunnerEngine } from './runner-engine';
const c = launchConfig.game;
function coin(engine: RunnerEngine) {
  Object.assign(engine.objects[0], {
    active: true,
    kind: 'bolt',
    x: c.playerX + 12,
    y: c.ground - c.boltHeight,
    width: c.boltWidth,
    height: c.boltHeight,
  });
}
describe('Runner physics and procedural generation', () => {
  it('requires explicit start, accepts only a grounded jump and lands without infinite jumps', () => {
    const engine = new RunnerEngine();
    expect(engine.jump()).toBe(false);
    engine.advance(1);
    expect(engine.distance).toBe(0);
    engine.start();
    expect(engine.jump()).toBe(true);
    expect(engine.jump()).toBe(false);
    let minimum = engine.y;
    for (let index = 0; index < 120; index++) {
      engine.advance(1 / 120);
      minimum = Math.min(minimum, engine.y);
    }
    expect(minimum).toBeLessThan(c.ground - c.playerHeight - 120);
    expect(engine.y).toBe(c.ground - c.playerHeight);
    expect(engine.vy).toBe(0);
    expect(engine.jump()).toBe(true);
  });
  it('matches physics across 30, 60 and 120 fps', () => {
    const states = [30, 60, 120].map((fps) => {
      const engine = new RunnerEngine();
      engine.start();
      engine.jump();
      for (let step = 0; step < fps / 2; step++) engine.advance(1 / fps);
      return engine;
    });
    for (const engine of states) {
      expect(engine.y).toBeCloseTo(states[0].y, 6);
      expect(engine.distance).toBeCloseTo(states[0].distance, 6);
    }
  });
  it('scores only a collected bolt, never distance, and never collects it twice', () => {
    const engine = new RunnerEngine();
    engine.start();
    engine.advance(0.1);
    expect(engine.score).toBe(0);
    coin(engine);
    engine.advance(1 / 120);
    expect(engine.score).toBe(1);
    expect(engine.objects[0].active).toBe(false);
    engine.advance(0.1);
    expect(engine.score).toBe(1);
    expect(engine.running).toBe(true);
  });
  it('ends immediately on a hit and restarts explicitly without retaining run objects or score', () => {
    const engine = new RunnerEngine();
    engine.start();
    coin(engine);
    engine.advance(1 / 120);
    Object.assign(engine.objects[1], {
      active: true,
      kind: 'obstacle',
      x: c.playerX,
      y: c.ground - c.obstacleHeight,
      width: c.obstacleWidth,
      height: c.obstacleHeight,
    });
    engine.advance(1 / 120);
    expect(engine.dead).toBe(true);
    expect(engine.running).toBe(false);
    expect(engine.score).toBe(1);
    const distance = engine.distance;
    engine.advance(4);
    expect(engine.distance).toBe(distance);
    expect(engine.jump()).toBe(false);
    engine.start();
    expect(engine.score).toBe(0);
    expect(engine.objects.every((object) => !object.active)).toBe(true);
    expect(engine.dead).toBe(false);
  });
  it('ignores transparent-edge proximity rather than using the full rectangle', () => {
    const engine = new RunnerEngine();
    engine.start();
    Object.assign(engine.objects[0], {
      active: true,
      kind: 'obstacle',
      x: c.playerX + c.playerWidth - 1,
      y: c.ground - c.obstacleHeight,
      width: c.obstacleWidth,
      height: c.obstacleHeight,
    });
    engine.advance(1 / 120);
    expect(engine.running).toBe(true);
  });
  it('recycles a fixed pool and scenery, evolves speed and avoids recent patterns', () => {
    let seed = 11;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const engine = new RunnerEngine(c, random);
    const pool = [...engine.objects];
    engine.setWidth(360);
    expect(engine.width).toBe(c.minWidth);
    engine.start();
    const patterns: number[] = [];
    let prior = 0;
    for (let frame = 0; frame < 120 * 180; frame++) {
      // This generation-only sweep clears approaching challenges; collision is tested separately.
      engine.objects.forEach((object) => {
        if (object.x < c.playerX + 200) object.active = false;
      });
      engine.advance(1 / 120);
      if (
        engine.objects.some((object) => object.active && object.x > engine.width + 40) &&
        engine.distance > prior + 100
      ) {
        const id = engine.patternHistory.at(-1)!;
        if (patterns.at(-1) !== id) patterns.push(id);
        prior = engine.distance;
      }
    }
    expect(engine.running).toBe(true);
    expect(engine.speed).toBeGreaterThan(c.initialSpeed);
    expect(engine.speed).toBeLessThan(c.speedLimit);
    expect(engine.objects).toEqual(pool);
    expect(patterns.length).toBeGreaterThan(10);
    expect(new Set(patterns).size).toBeGreaterThan(5);
    expect(engine.patternHistory.length).toBeLessThanOrEqual(c.recentPatterns);
    expect(
      engine.scenery.every(
        (x) =>
          x >= -engine.width * c.segmentWidthRatio && x < engine.width * c.segmentWidthRatio * 3,
      ),
    ).toBe(true);
  });
  it('keeps challenge spacings compatible with jump, recovery and reaction at both viewport widths', () => {
    for (const width of [c.minWidth, c.width]) {
      const engine = new RunnerEngine(c, () => 0.5);
      engine.setWidth(width);
      engine.start();
      let lastSpawn = 0;
      let previousHistory = '';
      for (let index = 0; index < 120 * 120; index++) {
        engine.objects.forEach((object) => {
          if (object.x < c.playerX + 250) object.active = false;
        });
        const speed = engine.speed;
        engine.advance(1 / 120);
        const history = engine.patternHistory.join(',');
        if (history !== previousHistory) {
          const minimum =
            speed * ((2 * c.jumpImpulse) / c.gravity + c.recoverySeconds + c.reactionSeconds);
          if (lastSpawn) expect(engine.distance - lastSpawn).toBeGreaterThanOrEqual(minimum * 0.85);
          lastSpawn = engine.distance;
          previousHistory = history;
          const list = engine.patternHistory;
          expect(new Set(list).size).toBe(list.length);
        }
      }
    }
  });
  it('does not move the world horizontally with the player and ignores invalid time steps', () => {
    const engine = new RunnerEngine();
    engine.start();
    engine.advance(NaN);
    expect(engine.distance).toBe(0);
    engine.setWidth(1200);
    expect(engine.width).toBe(c.width);
    engine.jump();
    engine.advance(0.05);
    expect(engine.settings.playerX).toBe(c.playerX);
    engine.stop();
    const y = engine.y;
    engine.advance(0.1);
    expect(engine.y).toBe(y);
  });
});

describe('Playable generated runs', () => {
  it.each([600, 900])(
    'admits a grounded jump strategy across different random seeds at width %s',
    (width) => {
      for (const seedValue of [1, 7, 42]) {
        let seed = seedValue;
        const random = () => {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        const engine = new RunnerEngine(c, random);
        engine.setWidth(width);
        engine.start();
        for (let frame = 0; frame < 60 * 240 && engine.running; frame++) {
          const ahead = engine.objects
            .filter(
              (object) =>
                object.active && object.kind === 'obstacle' && object.x + object.width > c.playerX,
            )
            .sort((a, b) => a.x - b.x)[0];
          const isOverhead = ahead && ahead.y + ahead.height < c.ground - c.playerHeight;
          if (ahead && !isOverhead && ahead.x - (c.playerX + c.playerWidth) <= engine.speed * 0.23)
            engine.jump();
          engine.advance(1 / 60);
        }
        expect(engine.running, 'seed ' + seedValue).toBe(true);
        expect(engine.segments).toBeGreaterThan(100);
        expect(engine.score).toBeGreaterThan(0);
      }
    },
  );
});

describe('Three obstacle lanes', () => {
  function obstacle(y: number) {
    const engine = new RunnerEngine();
    engine.start();
    Object.assign(engine.objects[0], {
      active: true,
      kind: 'obstacle',
      x: c.playerX,
      y,
      width: c.obstacleWidth,
      height: c.obstacleHeight,
    });
    return engine;
  }
  it('makes low and middle obstacles collide on the ground, but allows standing below overhead ones', () => {
    for (const y of [
      c.ground - c.obstacleHeight,
      c.ground - c.obstacleHeight - c.middleObstacleLift,
    ]) {
      const engine = obstacle(y);
      engine.advance(1 / 120);
      expect(engine.dead).toBe(true);
    }
    const high = obstacle(c.ground - c.playerHeight - c.overheadClearance - c.obstacleHeight);
    high.advance(1 / 120);
    expect(high.running).toBe(true);
  });
  it('makes a full jump hit an overhead obstacle instead of allowing it to clear the top', () => {
    const highY = c.ground - c.playerHeight - c.overheadClearance - c.obstacleHeight;
    expect(c.ground - c.jumpImpulse ** 2 / (2 * c.gravity)).toBeGreaterThan(highY);
    const engine = new RunnerEngine();
    engine.start();
    engine.jump();
    for (let index = 0; index < 15; index++) engine.advance(1 / 120);
    Object.assign(engine.objects[0], {
      active: true,
      kind: 'obstacle',
      x: c.playerX,
      y: highY,
      width: c.obstacleWidth,
      height: c.obstacleHeight,
    });
    engine.advance(1 / 120);
    expect(engine.dead).toBe(true);
  });
  it('increases speed meaningfully within the opening fifteen seconds', () => {
    const engine = new RunnerEngine();
    engine.start();
    for (let frame = 0; frame < 120 * 15; frame++) {
      engine.objects.forEach((item) => {
        if (item.x < c.playerX + 200) item.active = false;
      });
      engine.advance(1 / 120);
    }
    expect(engine.speed).toBeGreaterThan(c.initialSpeed * 1.5);
  });
});
