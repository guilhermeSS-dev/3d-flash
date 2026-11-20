import schedule from './launch-schedule.json';
import runnerAssets from './runner-assets.generated.json';

/** Launch schedule, external UTC clock and gameplay configuration. */
export const launchConfig = {
  ...schedule,
  timeSource: {
    url: 'https://timeapi.io/api/time/current/zone?timeZone=Etc%2FUTC',
    refreshMs: 30000,
    maxAgeMs: 90000,
    retryMs: 3000,
    timeoutMs: 5000,
  },
  VIP_REWARD_THRESHOLD: 7,
  VIP_WHATSAPP_URL: 'https://chat.whatsapp.com/BPLWZt6gnVlFPvCdypdvvY?s=cl&p=i&iam=2',
  vipPickup: {
    flightSeconds: 2.2,
    reducedFlightSeconds: 0.6,
    size: 40,
    floatAmplitude: 12,
    floatFrequency: 5,
  },
  storageKey: '3d-flash.launch.v1',
  countdownRefreshMs: 200,
  reveal: {
    anticipationMs: 1100,
    durationMs: 15000,
    columns: 128,
    minTilePx: 3.5,
    frontierRows: 6,
  },
  game: {
    width: 900,
    minWidth: 600,
    height: 280,
    ground: 230,
    playerX: 90,
    playerWidth: 44,
    playerHeight: 59,
    gravity: 1900,
    jumpImpulse: 700,
    initialSpeed: 260,
    speedLimit: 720,
    progressionSegments: 2,
    reactionSeconds: 0.5,
    recoverySeconds: 0.14,
    segmentWidthRatio: 0.5,
    fixedStep: 1 / 120,
    maxFrameSeconds: 0.1,
    obstacleWidth: 52,
    obstacleHeight: 43,
    middleObstacleLift: 30,
    overheadClearance: 40,
    airborneStartStage: 1,
    overheadStartStage: 2,
    boltWidth: 18,
    boltHeight: 45,
    hitboxInset: 6,
    collectibleInset: 2,
    recentPatterns: 3,
    objectPoolSize: 32,
    spawnPadding: 64,
    speedCurve: 0.3,
    speedSmoothing: 1.8,
    gapVariation: 0.25,
    initialGraceSeconds: 1,
    coinMinJumpHeight: 100,
    coinJumpHeight: 130,
    patternOffsetRatio: 0.08,
    maxDpr: 2,
  },
  audio: {
    collectHz: 880,
    collisionHz: 220,
    volume: 0.07,
    durationSeconds: 0.12,
    collisionDurationSeconds: 0.55,
    collisionGain: 1.8,
    maxVoices: 4,
    musicVolume: 0.012,
    musicBpm: 126,
    musicLookaheadMs: 80,
    musicScheduleSeconds: 0.16,
  },
  spriteAnimation: { playerRate: 1, obstacleRate: 1, boltRate: 1 },
  rendering: { removeConnectedBackground: false, whiteCutoff: 240, whiteTolerance: 18 },
  assets: runnerAssets,
} as const;

/** Widen literal values for test injection and future campaign edits. */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly number[]
        ? readonly number[]
        : { readonly [K in keyof T]: Widen<T[K]> };
export type LaunchConfig = Widen<typeof launchConfig>;
