import { type LaunchConfig } from '../../core/config/launch.config';
import { type RunnerAsset, type RunnerSprite } from './runner-animation';

export async function loadRunnerSprites(
  settings: LaunchConfig,
  signal: AbortSignal,
): Promise<RunnerSprite[]> {
  const results = await Promise.allSettled(
    [settings.assets.player, settings.assets.obstacle, settings.assets.bolt].map((asset) =>
      loadAtlas(asset, settings, signal),
    ),
  );
  const sprites = results.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  );
  const failure = results.find((result) => result.status === 'rejected');
  if (failure || signal.aborted) {
    sprites.forEach((sprite) => sprite.dispose());
    throw failure?.reason ?? new Error('cancelled');
  }
  return sprites;
}

function loadAtlas(
  asset: RunnerAsset,
  settings: LaunchConfig,
  signal: AbortSignal,
): Promise<RunnerSprite> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let processed: HTMLCanvasElement | undefined;
    let released = false;
    const detach = () => {
      signal.removeEventListener('abort', abort);
      image.onload = image.onerror = null;
    };
    const dispose = () => {
      if (released) return;
      released = true;
      detach();
      image.src = '';
      if (processed) processed.width = processed.height = 0;
    };
    const abort = () => {
      dispose();
      reject(new Error('cancelled'));
    };
    signal.addEventListener('abort', abort, { once: true });
    image.onerror = () => {
      dispose();
      reject(new Error('sprite unavailable'));
    };
    image.onload = () => {
      if (signal.aborted) {
        abort();
        return;
      }
      try {
        const width = asset.frameWidth * asset.frameDurationsMs.length;
        const height = asset.frameHeight;
        if (image.naturalWidth !== width || image.naturalHeight !== height)
          throw new Error('invalid sprite atlas dimensions');
        let source: CanvasImageSource = image;
        // Kept for legacy opaque assets. Original animated atlases already contain valid alpha.
        if (settings.rendering.removeConnectedBackground) {
          processed = document.createElement('canvas');
          processed.width = width;
          processed.height = height;
          const context = processed.getContext('2d');
          if (!context) throw new Error('canvas unavailable');
          context.drawImage(image, 0, 0);
          removeBorderWhite(context, width, height, settings);
          source = processed;
        }
        detach();
        resolve({ image: source, asset, dispose });
      } catch (error) {
        dispose();
        reject(error);
      }
    };
    if (signal.aborted) abort();
    else image.src = asset.src;
  });
}

function removeBorderWhite(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: LaunchConfig,
): void {
  const pixels = context.getImageData(0, 0, width, height);
  const data = pixels.data,
    seen = new Uint8Array(width * height),
    queue = new Int32Array(width * height);
  let head = 0,
    tail = 0;
  const enqueue = (index: number) => {
    if (seen[index]) return;
    seen[index] = 1;
    const offset = index * 4;
    const minimum = Math.min(data[offset], data[offset + 1], data[offset + 2]);
    const maximum = Math.max(data[offset], data[offset + 1], data[offset + 2]);
    if (
      data[offset + 3] === 0 ||
      (minimum >= settings.rendering.whiteCutoff &&
        maximum - minimum <= settings.rendering.whiteTolerance)
    )
      queue[tail++] = index;
  };
  for (let col = 0; col < width; col++) {
    enqueue(col);
    enqueue((height - 1) * width + col);
  }
  for (let row = 0; row < height; row++) {
    enqueue(row * width);
    enqueue(row * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    data[index * 4 + 3] = 0;
    if (index % width > 0) enqueue(index - 1);
    if (index % width < width - 1) enqueue(index + 1);
    if (index >= width) enqueue(index - width);
    if (index + width < width * height) enqueue(index + width);
  }
  context.putImageData(pixels, 0, 0);
}
export class RunnerAudio {
  private context: AudioContext | undefined;
  private voices = new Set<OscillatorNode>();
  private musicVoices = new Set<OscillatorNode>();
  private musicTimer: ReturnType<typeof setTimeout> | undefined;
  private musicWanted = false;
  private note = 0;
  private nextNote = 0;
  muted = false;
  constructor(private settings: LaunchConfig['audio']) {}
  unlock(): void {
    if (this.muted) return;
    try {
      if (!this.context) {
        const context = (this.context = new AudioContext());
        context.onstatechange = () => {
          if (
            this.context === context &&
            context.state === 'running' &&
            this.musicWanted &&
            !this.muted
          )
            this.scheduleMusic();
        };
      }
      void this.context
        .resume()
        .then(() => {
          if (this.musicWanted && !this.muted) this.scheduleMusic();
        })
        .catch(() => {});
    } catch {
      /* Sound is optional. */
    }
  }
  play(kind: 'collect' | 'collision'): void {
    if (kind === 'collision') {
      this.stopMusic();
      this.voices.forEach((voice) => {
        try {
          voice.stop();
        } catch {
          /* ended */
        }
      });
      this.voices.clear();
    }
    const audio = this.context;
    if (
      this.muted ||
      !audio ||
      audio.state !== 'running' ||
      this.voices.size >= this.settings.maxVoices
    )
      return;
    try {
      const oscillator = audio.createOscillator(),
        gain = audio.createGain(),
        now = audio.currentTime;
      const frequency = kind === 'collect' ? this.settings.collectHz : this.settings.collisionHz;
      oscillator.type = kind === 'collect' ? 'sine' : 'sawtooth';
      oscillator.frequency.setValueAtTime(frequency, now);
      const duration =
        kind === 'collect' ? this.settings.durationSeconds : this.settings.collisionDurationSeconds;
      if (kind === 'collision') {
        oscillator.frequency.setValueAtTime(frequency * 0.7, now + duration * 0.17);
        oscillator.frequency.setValueAtTime(frequency * 0.5, now + duration * 0.34);
      }
      oscillator.frequency.exponentialRampToValueAtTime(
        kind === 'collect' ? frequency / 2 : 32,
        now + duration,
      );
      gain.gain.setValueAtTime(
        this.settings.volume * (kind === 'collision' ? this.settings.collisionGain : 1),
        now,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      this.voices.add(oscillator);
      oscillator.onended = () => {
        this.voices.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start();
      oscillator.stop(now + duration + 0.01);
    } catch {
      /* Audio must never interrupt a run. */
    }
  }
  startMusic(): void {
    this.musicWanted = true;
    this.nextNote = this.context?.currentTime ?? 0;
    this.note = 0;
    this.scheduleMusic();
  }
  stopMusic(): void {
    this.musicWanted = false;
    this.clearMusic();
  }
  private clearMusic(): void {
    if (this.musicTimer) clearTimeout(this.musicTimer);
    this.musicTimer = undefined;
    this.musicVoices.forEach((voice) => {
      try {
        voice.stop();
      } catch {
        /* ended */
      }
    });
    this.musicVoices.clear();
  }
  private scheduleMusic(): void {
    const audio = this.context;
    if (this.musicTimer || !audio || audio.state !== 'running' || this.muted || !this.musicWanted)
      return;
    // Original two-bar chiptune phrase; quieter than collection and collision effects.
    const melody = [659, 0, 784, 880, 988, 784, 659, 587, 523, 659, 784, 0, 587, 659, 494, 587];
    const step = 60 / this.settings.musicBpm / 2;
    this.nextNote = Math.max(this.nextNote, audio.currentTime);
    let scheduled = 0;
    while (
      this.nextNote < audio.currentTime + this.settings.musicScheduleSeconds &&
      scheduled++ < 4
    ) {
      const frequency = melody[this.note % melody.length];
      if (frequency) {
        try {
          const voice = audio.createOscillator(),
            gain = audio.createGain(),
            at = this.nextNote;
          voice.type = this.note % 4 === 0 ? 'triangle' : 'square';
          voice.frequency.setValueAtTime(frequency, at);
          gain.gain.setValueAtTime(this.settings.musicVolume, at);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + step * 0.7);
          voice.connect(gain);
          gain.connect(audio.destination);
          this.musicVoices.add(voice);
          voice.onended = () => {
            this.musicVoices.delete(voice);
            voice.disconnect();
            gain.disconnect();
          };
          voice.start(at);
          voice.stop(at + step * 0.75);
        } catch {
          /* Optional audio. */
        }
      }
      this.nextNote += step;
      this.note++;
    }
    this.musicTimer = setTimeout(() => {
      this.musicTimer = undefined;
      this.scheduleMusic();
    }, this.settings.musicLookaheadMs);
  }
  suspend(): void {
    this.clearMusic();
    try {
      void this.context?.suspend().catch(() => {});
    } catch {
      /* optional */
    }
  }
  close(): void {
    this.stopMusic();
    this.voices.forEach((voice) => {
      try {
        voice.stop();
      } catch {
        /* already stopped */
      }
    });
    this.voices.clear();
    if (this.context) this.context.onstatechange = null;
    try {
      void this.context?.close().catch(() => {});
    } catch {
      /* optional */
    }
    this.context = undefined;
  }
}
