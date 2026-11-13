import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animationConfig } from '../../../core/config/animation.config';

interface RevealGroup {
  readonly key: string;
  readonly section: HTMLElement;
  readonly targets: HTMLElement[];
}

/** Scoped secondary motion. Markup remains visible when JS or motion support is unavailable. */
export function setupHomeEntrances(
  root: HTMLElement,
  claimEntrance: (id: string) => boolean,
): () => void {
  const document = root.ownerDocument;
  const view = document.defaultView;
  if (!view || typeof view.matchMedia !== 'function') return () => {};

  gsap.registerPlugin(ScrollTrigger);

  const definitions = [
    ['#sobre', '.about-copy, .about-visual', 'section:about'],
    ['#curso', '.course-copy, .course-product, .course-action', 'section:course'],
    ['#contato', '.contact-copy, .social-links', 'section:contact'],
    ['#rodape', '.footer-layout', 'section:footer'],
  ] as const;
  const groups: RevealGroup[] = definitions.flatMap(([sectionSelector, targetSelector, key]) => {
    const section = root.querySelector<HTMLElement>(sectionSelector);
    if (!section) return [];
    const targets = Array.from(section.querySelectorAll<HTMLElement>(targetSelector));
    return targets.length ? [{ key, section, targets }] : [];
  });
  const hero = root.querySelector<HTMLElement>('#inicio');
  const introTargets = Array.from(
    root.querySelectorAll<HTMLElement>('#inicio .brand-logo, #inicio .hero-copy'),
  );
  const revealed = new Set<HTMLElement>();
  let openingConsumed = false;
  let disposed = false;
  let media: gsap.MatchMedia | undefined;

  const containsFocus = (element: HTMLElement): boolean => {
    const active = document.activeElement;
    return !!active && (active === element || element.contains(active));
  };

  const context = gsap.context(() => {
    media = gsap.matchMedia();
    media.add(
      {
        regular: '(prefers-reduced-motion: no-preference)',
        reduced: animationConfig.reducedMotionQuery,
      },
      (mediaContext) => {
        if (mediaContext.conditions?.['reduced']) {
          openingConsumed = true;
          claimEntrance('opening');
          groups.forEach(({ key, section }) => {
            claimEntrance(key);
            revealed.add(section);
          });
          return;
        }
        if (!mediaContext.conditions?.['regular']) return;

        const tweens = new Map<HTMLElement, gsap.core.Tween>();
        const triggers = new Map<HTMLElement, ScrollTrigger>();
        let opening: gsap.core.Tween | undefined;

        if (!openingConsumed) {
          openingConsumed = true;
          const claimed = claimEntrance('opening');
          if (
            claimed &&
            introTargets.length &&
            view.scrollY <= 4 &&
            !view.location.hash &&
            !(hero && containsFocus(hero))
          ) {
            opening = gsap.fromTo(
              introTargets,
              { opacity: 0, y: 8 },
              {
                opacity: 1,
                y: 0,
                duration: animationConfig.duration.opening,
                ease: 'power1.out',
              },
            );
          }
        }

        for (const group of groups) {
          if (revealed.has(group.section)) continue;

          // Content already reached through a deep link or restored position stays visible.
          if (
            containsFocus(group.section) ||
            group.section.getBoundingClientRect().top <= view.innerHeight * 0.92
          ) {
            claimEntrance(group.key);
            revealed.add(group.section);
            continue;
          }

          const reveal = (direction: number): void => {
            if (disposed || revealed.has(group.section)) return;
            revealed.add(group.section);
            if (!claimEntrance(group.key)) return;
            if (
              direction < 0 ||
              containsFocus(group.section) ||
              group.section.getBoundingClientRect().top < 0
            ) {
              return;
            }

            // This callback runs later; explicitly record its tween in the media context.
            mediaContext.add(() => {
              tweens.set(
                group.section,
                gsap.fromTo(
                  group.targets,
                  { opacity: 0, y: 10 },
                  {
                    opacity: 1,
                    y: 0,
                    duration: animationConfig.duration.sectionReveal,
                    ease: 'power1.out',
                  },
                ),
              );
            });
          };

          triggers.set(
            group.section,
            ScrollTrigger.create({
              trigger: group.section,
              start: 'top 92%',
              once: true,
              onEnter: (self) => reveal(self.direction),
              onEnterBack: (self) => reveal(self.direction),
            }),
          );
        }

        const finishForFocus = (event: FocusEvent): void => {
          const target = event.target;
          if (!(target instanceof view.HTMLElement)) return;

          if (hero && (target === hero || hero.contains(target))) {
            opening?.progress(1).kill();
          }
          for (const { key, section } of groups) {
            if (target === section || section.contains(target)) {
              claimEntrance(key);
              revealed.add(section);
              tweens.get(section)?.progress(1).kill();
              triggers.get(section)?.kill();
            }
          }
        };
        root.addEventListener('focusin', finishForFocus);

        return () => root.removeEventListener('focusin', finishForFocus);
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
