import { launchConfig, type LaunchConfig } from '../../core/config/launch.config';
import { loadRunnerSprites, RunnerAudio } from './runner-media';
describe('Native runner media lifecycle', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('removes only connected border white and preserves enclosed white details', async () => {
    const outputs: Uint8ClampedArray[] = [];
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        naturalWidth = 5;
        naturalHeight = 5;
        set src(value: string) {
          if (value) queueMicrotask(() => this.onload?.());
        }
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          drawImage: vi.fn(),
          getImageData: () => {
            const data = new Uint8ClampedArray(5 * 5 * 4).fill(255);
            for (let y = 1; y < 4; y++)
              for (let x = 1; x < 4; x++)
                if (x !== 2 || y !== 2) {
                  const i = (y * 5 + x) * 4;
                  data[i] = data[i + 1] = data[i + 2] = 0;
                }
            return { data, width: 5, height: 5 };
          },
          putImageData: (pixels: ImageData) => outputs.push(pixels.data),
        }) as unknown as CanvasRenderingContext2D,
    );
    const asset = {
      src: '/test-sprite.png',
      frameWidth: 5,
      frameHeight: 5,
      frameDurationsMs: [100],
      anchor: [2.5, 2.5],
      referenceHeight: 5,
    };
    const config: LaunchConfig = {
      ...launchConfig,
      rendering: { ...launchConfig.rendering, removeConnectedBackground: true },
      assets: { player: asset, obstacle: asset, bolt: asset },
    };
    const sprites = await loadRunnerSprites(config, new AbortController().signal);
    expect(sprites).toHaveLength(3);
    expect(outputs).toHaveLength(3);
    expect(outputs[0][3]).toBe(0);
    expect(outputs[0][(2 * 5 + 2) * 4 + 3]).toBe(255);
  });
  it('rejects failed sprites and aborted loads without substituting a generic image', async () => {
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(value: string) {
          if (value) queueMicrotask(() => this.onerror?.());
        }
      },
    );
    await expect(loadRunnerSprites(launchConfig, new AbortController().signal)).rejects.toThrow(
      'sprite unavailable',
    );
    const controller = new AbortController();
    controller.abort();
    await expect(loadRunnerSprites(launchConfig, controller.signal)).rejects.toThrow('cancelled');
  });
  it('tolerates unavailable audio and keeps effects bounded when audio works', () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('unavailable');
        }
      },
    );
    const silent = new RunnerAudio(launchConfig.audio);
    expect(() => {
      silent.unlock();
      silent.play('collect');
      silent.close();
    }).not.toThrow();
    const start = vi.fn(),
      stop = vi.fn(),
      createOscillator = vi.fn(() => ({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start,
        stop,
        onended: null,
      }));
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running';
        currentTime = 0;
        destination = {};
        resume = () => Promise.resolve();
        suspend = () => Promise.resolve();
        close = () => Promise.resolve();
        createOscillator = createOscillator;
        createGain = () => ({
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          disconnect: vi.fn(),
        });
      },
    );
    const audio = new RunnerAudio(launchConfig.audio);
    expect(createOscillator).not.toHaveBeenCalled();
    audio.unlock();
    for (let index = 0; index < launchConfig.audio.maxVoices + 2; index++) audio.play('collect');
    expect(start).toHaveBeenCalledTimes(launchConfig.audio.maxVoices);
    audio.play('collision');
    expect(start).toHaveBeenCalledTimes(launchConfig.audio.maxVoices + 1);
    audio.muted = true;
    audio.play('collect');
    expect(start).toHaveBeenCalledTimes(launchConfig.audio.maxVoices + 1);
    audio.close();
    expect(stop.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
  it('schedules quiet original arcade music, stops it on defeat and releases its timers', async () => {
    vi.useFakeTimers();
    const gains: number[] = [];
    const oscillators: {
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }[] = [];
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running';
        currentTime = 0;
        destination = {};
        resume = async () => {};
        suspend = async () => {};
        close = async () => {};
        createOscillator() {
          const oscillator = {
            type: 'sine',
            frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
            start: vi.fn(),
            stop: vi.fn(),
            connect: vi.fn(),
            disconnect: vi.fn(),
            onended: null,
          };
          oscillators.push(oscillator);
          return oscillator;
        }
        createGain() {
          return {
            gain: {
              setValueAtTime: (value: number) => gains.push(value),
              exponentialRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
            disconnect: vi.fn(),
          };
        }
      },
    );
    const audio = new RunnerAudio(launchConfig.audio);
    audio.unlock();
    audio.startMusic();
    expect(gains[0]).toBe(launchConfig.audio.musicVolume);
    expect(vi.getTimerCount()).toBe(1);
    audio.play('collect');
    expect(gains.at(-1)).toBeGreaterThan(gains[0]);
    audio.play('collision');
    expect(vi.getTimerCount()).toBe(0);
    expect(oscillators.at(-1)!.type).toBe('sawtooth');
    expect(oscillators.at(-1)!.stop).toHaveBeenCalledWith(
      launchConfig.audio.collisionDurationSeconds + 0.01,
    );
    audio.startMusic();
    audio.suspend();
    expect(vi.getTimerCount()).toBe(0);
    audio.close();
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('loads transparent atlases once, keeps original frame timing and frees decoded images', async () => {
    const images: { source: string }[] = [];
    vi.stubGlobal(
      'Image',
      class {
        source = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          images.push(this);
        }
        get asset() {
          return Object.values(launchConfig.assets).find((asset) => asset.src === this.source)!;
        }
        get naturalWidth() {
          return this.asset.frameWidth * this.asset.frameDurationsMs.length;
        }
        get naturalHeight() {
          return this.asset.frameHeight;
        }
        set src(value: string) {
          this.source = value;
          if (value) queueMicrotask(() => this.onload?.());
        }
      },
    );
    const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    const sprites = await loadRunnerSprites(launchConfig, new AbortController().signal);
    expect(sprites).toHaveLength(3);
    expect(sprites[0].asset.frameDurationsMs).toEqual([70, 70, 70, 70, 70, 70, 70, 70, 70]);
    expect(sprites[1].asset.frameDurationsMs).toHaveLength(9);
    expect(canvas).not.toHaveBeenCalled();
    sprites.forEach((sprite) => sprite.dispose());
    expect(images.every((image) => image.source === '')).toBe(true);
  });
  it('rejects a malformed atlas and also releases the other successfully decoded resources', async () => {
    const images: { source: string }[] = [];
    vi.stubGlobal(
      'Image',
      class {
        source = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          images.push(this);
        }
        get asset() {
          return Object.values(launchConfig.assets).find((asset) => asset.src === this.source)!;
        }
        get naturalWidth() {
          return this.source === launchConfig.assets.player.src
            ? 1
            : this.asset.frameWidth * this.asset.frameDurationsMs.length;
        }
        get naturalHeight() {
          return this.asset.frameHeight;
        }
        set src(value: string) {
          this.source = value;
          if (value) queueMicrotask(() => this.onload?.());
        }
      },
    );
    await expect(loadRunnerSprites(launchConfig, new AbortController().signal)).rejects.toThrow(
      'invalid sprite atlas dimensions',
    );
    expect(images.every((image) => image.source === '')).toBe(true);
  });
});
