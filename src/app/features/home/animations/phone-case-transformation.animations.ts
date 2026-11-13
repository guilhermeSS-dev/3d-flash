import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animationConfig } from '../../../core/config/animation.config';

export interface CaseTransformationSession {
  caseTransformationStarted(): boolean;
  claimCaseTransformation(): boolean;
}

function imageReady(image: HTMLImageElement, signal: AbortSignal): Promise<boolean> {
  if (image.complete) return Promise.resolve(image.naturalWidth > 0);

  return new Promise((resolve) => {
    const finish = (ready: boolean): void => {
      image.removeEventListener('load', loaded);
      image.removeEventListener('error', failed);
      signal.removeEventListener('abort', aborted);
      resolve(ready);
    };
    const loaded = (): void => finish(image.naturalWidth > 0);
    const failed = (): void => finish(false);
    const aborted = (): void => finish(false);
    image.addEventListener('load', loaded, { once: true });
    image.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', aborted, { once: true });
  });
}

/** Default CSS shows the physical case, including on reduced motion and remounts. */
export function setupPhoneCaseTransformation(
  root: HTMLElement,
  section: HTMLElement,
  session: CaseTransformationSession,
): () => void {
  const view = root.ownerDocument.defaultView;
  const digital = root.querySelector<HTMLImageElement>('.case-image--digital');
  const physical = root.querySelector<HTMLImageElement>('.case-image--physical');
  if (!view || typeof view.matchMedia !== 'function' || !digital || !physical) return () => {};
  if (session.caseTransformationStarted()) return () => {};

  gsap.registerPlugin(ScrollTrigger);
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
        if (mediaContext.conditions?.['reduced']) {
          session.claimCaseTransformation();
          root.dataset['caseState'] = 'physical';
          return;
        }
        if (!mediaContext.conditions?.['regular'] || session.caseTransformationStarted()) return;

        let alive = true;
        const pendingImages = new AbortController();
        const readiness = Promise.all([
          imageReady(digital, pendingImages.signal),
          imageReady(physical, pendingImages.signal),
        ]);

        gsap.set(digital, { opacity: 1, scale: 1 });
        gsap.set(physical, { opacity: 0, scale: 1.015 });
        root.dataset['caseState'] = 'digital';

        const showPhysical = (): void => {
          root.dataset['caseState'] = 'physical';
          // Restore CSS final state without leaving transform/opacity overrides.
          for (const image of [digital, physical]) {
            image.style.removeProperty('opacity');
            image.style.removeProperty('transform');
          }
        };
        const timeline = gsap.timeline({ paused: true, onComplete: showPhysical });
        timeline.to(
          digital,
          {
            opacity: 0,
            scale: 0.985,
            duration: animationConfig.duration.caseTransformation,
            ease: 'power1.inOut',
          },
          0,
        );
        timeline.to(
          physical,
          {
            opacity: 1,
            scale: 1,
            duration: animationConfig.duration.caseTransformation,
            ease: 'power1.inOut',
          },
          0,
        );

        let waiting = false;
        const startOnDown = (self: ScrollTrigger): void => {
          if (
            waiting ||
            disposed ||
            !alive ||
            !self.isActive ||
            self.direction !== 1 ||
            self.scroll() <= 0
          )
            return;
          waiting = true;
          void readiness.then((ready) => {
            waiting = false;
            if (
              disposed ||
              !alive ||
              !ready.every(Boolean) ||
              !self.isActive ||
              self.direction !== 1 ||
              self.scroll() <= 0
            )
              return;
            if (!session.claimCaseTransformation()) return;
            root.dataset['caseState'] = 'transforming';
            timeline.play(0);
            self.kill();
          });
        };
        const trigger = ScrollTrigger.create({
          trigger: section,
          start: 'top 82%',
          end: 'bottom top',
          onEnter: startOnDown,
          // A tall viewport may already include this section at scroll zero.
          onUpdate: startOnDown,
        });

        void readiness.then(([digitalReady, physicalReady]) => {
          if (disposed || !alive || (digitalReady && physicalReady)) return;
          trigger.kill();
          timeline.kill();
          // Keep a successfully loaded original visible if its counterpart fails.
          if (physicalReady || !digitalReady) showPhysical();
        });

        return () => {
          alive = false;
          pendingImages.abort();
          trigger.kill();
          timeline.kill();
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
