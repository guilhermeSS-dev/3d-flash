import { gsap } from 'gsap';
import { animationConfig } from '../../../core/config/animation.config';

interface FloatTarget {
  readonly id: string;
  readonly inner: HTMLElement;
}

/** Stable variation by asset identity, independent of its position in the DOM list. */
function profileFor(id: string) {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;

  const { keychains } = animationConfig;
  return {
    distance: keychains.floatDistancePx * (0.65 + ((hash & 255) / 255) * 0.35),
    rotation: keychains.floatRotationDegrees * (0.6 + (((hash >>> 8) & 255) / 255) * 0.4),
    duration:
      keychains.floatHalfCycleMinSeconds +
      (((hash >>> 16) & 255) / 255) *
        (keychains.floatHalfCycleMaxSeconds - keychains.floatHalfCycleMinSeconds),
    phase: (hash >>> 24) / 256,
    tiltDirection: hash & 1 ? 1 : -1,
  };
}

/**
 * Inner-wrapper motion only. Outer wrappers remain available for the scroll trajectory.
 * The optional visibility target can follow the full travelling area in subsequent stages.
 */
export function setupKeychainFloat(
  root: HTMLElement,
  visibilityTarget: HTMLElement = root,
): () => void {
  const document = root.ownerDocument;
  const view = document.defaultView;
  if (!view || typeof view.matchMedia !== 'function') return () => {};

  const targets: FloatTarget[] = Array.from(
    root.querySelectorAll<HTMLElement>('[data-keychain-float]'),
  ).flatMap((inner) => {
    const owner = inner.closest<HTMLElement>('[data-keychain]');
    const id = owner?.dataset['keychain'];
    return id && inner.querySelector('img') ? [{ id, inner }] : [];
  });
  if (!targets.length) return () => {};

  let disposed = false;
  let media: gsap.MatchMedia | undefined;
  const context = gsap.context(() => {
    media = gsap.matchMedia();
    media.add(
      {
        regular: '(prefers-reduced-motion: no-preference)',
        reduced: animationConfig.reducedMotionQuery,
      },
      (mediaContext) => {
        if (mediaContext.conditions?.['reduced'] || !mediaContext.conditions?.['regular']) return;

        const tweens = targets.map(({ id, inner }) => {
          const profile = profileFor(id);
          const tilt = profile.rotation * profile.tiltDirection;
          const tween = gsap.fromTo(
            inner,
            { y: -profile.distance, rotation: -tilt },
            {
              y: profile.distance,
              rotation: tilt,
              duration: profile.duration,
              ease: 'sine.inOut',
              repeat: -1,
              yoyo: true,
              paused: true,
            },
          );
          // Include either half of the yoyo cycle, rather than starting every asset together.
          tween.totalTime(profile.phase * profile.duration * 2, true);
          return tween;
        });

        let alive = true;
        let inViewport = true;
        const updatePlayback = (): void => {
          if (!alive || disposed) return;
          const playing = inViewport && document.visibilityState !== 'hidden';
          tweens.forEach((tween) => tween.paused(!playing));
        };
        const observer =
          typeof view.IntersectionObserver === 'function'
            ? new view.IntersectionObserver((entries) => {
                if (!alive || disposed) return;
                const entry = entries.find((item) => item.target === visibilityTarget);
                if (!entry) return;
                inViewport = entry.isIntersecting;
                updatePlayback();
              })
            : undefined;

        observer?.observe(visibilityTarget);
        document.addEventListener('visibilitychange', updatePlayback);
        updatePlayback();

        return () => {
          alive = false;
          observer?.disconnect();
          document.removeEventListener('visibilitychange', updatePlayback);
          tweens.forEach((tween) => tween.kill());
        };
      },
      root,
    );
  }, root);

  return () => {
    if (disposed) return;
    disposed = true;
    media?.revert();
    context.revert();
  };
}
