/** Configuration only: initialize GSAP inside the relevant page lifecycle. */
export const animationConfig = {
  reducedMotionQuery: '(prefers-reduced-motion: reduce)',
  duration: {
    opening: 0.8,
    sectionReveal: 0.4,
    menu: 0.25,
    caseTransformation: 2,
  },
  // Provisional tuning values: validate during stage 6.
  keychains: {
    scrub: 0.65,
    floatDistancePx: 5,
    floatRotationDegrees: 2,
    floatHalfCycleMinSeconds: 2.7,
    floatHalfCycleMaxSeconds: 3.9,
    // Per-object travel envelope; visual tuning remains pending browser comparison.
    routeWidthMinPx: 24,
    routeWidthRatio: 0.03,
    routeWidthMaxPx: 54,
    routeHeightRatio: 2.2,
    routeClearancePx: 8,
    scrollHorizontalWeight: 0.08,
    frontScale: 1.04,
    arrivalViewportRatio: 0.6,
    // Arc-distance separation: independent of frame rate, direction and document height.
    followSpacingRatio: 0.82,
    followSpacingWidthFloor: 0.8,
    formationGapRatio: 0.35,
    formationScrollShare: 0.14,
  },
  electricity: {
    maxActiveSegments: 8,
    lifetimeSeconds: 0.22,
    minEmissionIntervalSeconds: 0.05,
    nativeScrollGraceSeconds: 0.12,
    minMovementPx: 3,
    maxLengthPx: 52,
    amplitudePx: 6,
    maxEmissionsPerFrame: 2,
    protectionPaddingPx: 8,
  },
} as const;
