import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animationConfig } from '../../../core/config/animation.config';
import { buildKeychainFormation } from './keychain-formation.geometry';
import { type KeychainMotionFrame, type KeychainMotionMember } from './keychain-motion.model';
import {
  sampleKeychainRoute,
  type KeychainRoute,
  type RouteRect,
  type RouteSize,
} from './keychain-route.geometry';
import { type KeychainRouteController, type KeychainRouteSnapshot } from './keychain-route-layout';

export interface KeychainScrollController {
  /** Rebuild against the latest geometry. The owner subsequently refreshes ScrollTrigger. */
  refresh(): void;
  destroy(): void;
}

export interface KeychainScrollOptions {
  readonly onFrame?: (frame: KeychainMotionFrame) => void;
}

interface TimingSegment {
  readonly from: number;
  readonly to: number;
  readonly at: number;
  readonly duration: number;
}

interface ScrollTiming {
  readonly segments: readonly TimingSegment[];
  readonly frontProgress: number;
  readonly corridorProgress: number;
  readonly catchupProgress: number;
  readonly arrivalProgress: number;
}

type RouteGeometry = NonNullable<KeychainRouteSnapshot['geometry']>;
interface ScrollCache {
  readonly route: KeychainRoute;
  readonly geometry: RouteGeometry;
  readonly timing: ScrollTiming;
  readonly members: readonly FormationMember[];
  readonly formationScale: number;
  readonly arrival: { readonly x: number; readonly y: number };
}

interface MemberElement {
  readonly id: string;
  readonly element: HTMLElement;
  readonly baseAngle: number;
  readonly originals: readonly { name: string; value: string; priority: string }[];
}

interface MovingMember extends MemberElement {
  readonly rect: RouteRect;
  readonly fitScale: number;
  readonly lagProgress: number;
}

interface FormationMember extends MovingMember {
  readonly slot: { readonly x: number; readonly y: number };
}

const EPSILON = 1e-7;
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const interpolate = (from: number, to: number, progress: number): number =>
  from + (to - from) * clamp(progress);
const smoothstep = (value: number): number => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};

/** Allocate enough scroll time to horizontal crossings without letting them dominate the page. */
function timingFor(route: KeychainRoute): ScrollTiming {
  let distance = 0;
  let totalWeight = 0;
  let frontProgress = 0;
  let corridorProgress = 0;
  let catchupProgress = 0;
  let arrivalProgress = 0;
  const segments: { from: number; to: number; at: number; duration: number }[] = [];
  for (let index = 1; index < route.points.length; index++) {
    const from = route.points[index - 1];
    const to = route.points[index];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const arcStart = distance / route.totalLength;
    distance += length;
    const arcEnd = distance / route.totalLength;
    if (to.key === 'hero-front') frontProgress = arcEnd;
    if (to.key === 'hero-right') corridorProgress = arcEnd;
    if (to.key === 'contact-right') catchupProgress = arcEnd;
    if (to.key === 'contact-arrival-right') arrivalProgress = arcEnd;
    if (length <= EPSILON) continue;
    const weight =
      Math.max(dy, 1) + Math.abs(dx) * animationConfig.keychains.scrollHorizontalWeight;
    segments.push({ from: arcStart, to: arcEnd, at: totalWeight, duration: weight });
    totalWeight += weight;
  }
  const last = segments.at(-1);
  if (last) {
    const others = totalWeight - last.duration;
    const share = animationConfig.keychains.formationScrollShare;
    const minimum = (others * share) / (1 - share);
    if (last.duration < minimum) {
      totalWeight += minimum - last.duration;
      last.duration = minimum;
    }
  }
  return {
    segments: segments.map((segment) => ({
      ...segment,
      at: segment.at / totalWeight,
      duration: segment.duration / totalWeight,
    })),
    frontProgress,
    corridorProgress,
    catchupProgress,
    arrivalProgress,
  };
}

function timeForProgress(timing: ScrollTiming, value: number): number {
  const progress = clamp(value);
  if (progress === 0 || progress === 1) return progress;
  for (const segment of timing.segments) {
    if (progress <= segment.to + EPSILON) {
      const fraction = (progress - segment.from) / (segment.to - segment.from);
      return segment.at + segment.duration * clamp(fraction);
    }
  }
  return 1;
}

function travelBounds(rect: RouteRect): RouteSize {
  const { width, height } = rect;
  const rotation = (animationConfig.keychains.floatRotationDegrees * Math.PI) / 180;
  return {
    width: width * Math.cos(rotation) + height * Math.sin(rotation),
    height:
      height * Math.cos(rotation) +
      width * Math.sin(rotation) +
      2 * animationConfig.keychains.floatDistancePx,
  };
}

function travellingMembers(
  elements: readonly MemberElement[],
  geometry: RouteGeometry,
  length: number,
): readonly MovingMember[] {
  const measurements = new Map(geometry.members.map((member) => [member.id, member.rect]));
  let lag = 0;
  let previousHeight = 0;
  return elements.flatMap((member) => {
    const rect = measurements.get(member.id);
    if (!rect) return [];
    const bounds = travelBounds(rect);
    const fitScale = Math.min(
      1,
      geometry.footprint.width / bounds.width,
      geometry.footprint.height / bounds.height,
    );
    const height = bounds.height * fitScale;
    if (previousHeight > 0) {
      // A distance lag stays small on long pages and samples the same safe polyline at corners.
      lag += Math.max(
        geometry.footprint.width * animationConfig.keychains.followSpacingWidthFloor,
        ((previousHeight + height) / 2) * animationConfig.keychains.followSpacingRatio,
      );
    }
    previousHeight = height;
    return [{ ...member, rect, fitScale, lagProgress: lag / length }];
  });
}

/** Only the horizontal, protected arrival corridor may spread into individual slots. */
function validArrival(route: KeychainRoute, area: RouteRect): boolean {
  const last = route.points.at(-1);
  const approach = route.points.at(-2);
  const catchup = route.points.findIndex((point) => point.key === 'contact-right');
  const centerY = area.top + area.height / 2;
  return (
    !!last &&
    !!approach &&
    catchup >= 0 &&
    catchup < route.points.length - 2 &&
    approach.key === 'contact-arrival-right' &&
    last.key === 'contact-arrival' &&
    approach.x > last.x + EPSILON &&
    Math.abs(approach.y - centerY) < EPSILON &&
    Math.abs(last.y - centerY) < EPSILON &&
    Math.abs(last.x - (area.left + area.width / 2)) < EPSILON
  );
}

function usable(snapshot: KeychainRouteSnapshot): snapshot is KeychainRouteSnapshot & {
  route: KeychainRoute;
  geometry: RouteGeometry;
} {
  const geometry = snapshot.geometry;
  return (
    !!snapshot.route?.valid &&
    snapshot.route.totalLength > EPSILON &&
    !!geometry &&
    Number.isFinite(geometry.documentTop) &&
    !!geometry.formation &&
    [geometry.formation.left, geometry.formation.top].every(Number.isFinite) &&
    validArrival(snapshot.route, geometry.formation) &&
    [
      geometry.leader.width,
      geometry.leader.height,
      geometry.footprint.width,
      geometry.footprint.height,
      geometry.formation.width,
      geometry.formation.height,
    ].every((value) => Number.isFinite(value) && value > 0) &&
    Array.isArray(geometry.members) &&
    geometry.members.length > 0 &&
    geometry.members.every(
      ({ rect }) =>
        [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) &&
        rect.width > 0 &&
        rect.height > 0,
    )
  );
}

/** One reversible scroll clock drives the conductor and its distance-delayed followers. */
export function setupKeychainScroll(
  root: HTMLElement,
  layoutRoot: HTMLElement,
  layout: KeychainRouteController,
  options: KeychainScrollOptions = {},
): KeychainScrollController {
  let emptyResetSent = false;
  const publishFrame = (frame: KeychainMotionFrame): void => {
    if (!options.onFrame) return;
    const empty = frame.reason === 'reset' && frame.members.length === 0;
    if (empty && emptyResetSent) return;
    emptyResetSent = empty;
    options.onFrame(frame);
  };
  const clearMotion = (): void => {
    if (!options.onFrame || emptyResetSent) return;
    publishFrame({ progress: layout.getSnapshot().progress, reason: 'reset', members: [] });
  };
  const document = root.ownerDocument;
  const view = document.defaultView;
  const preferred = root.querySelector<HTMLElement>('[data-keychain="ro-modas"]');
  const leader = preferred?.querySelector('img')
    ? preferred
    : Array.from(root.querySelectorAll<HTMLElement>('[data-keychain]')).find((element) =>
        element.querySelector('img'),
      );
  if (!view || typeof view.matchMedia !== 'function' || !leader) {
    clearMotion();
    return { refresh: () => {}, destroy: () => {} };
  }

  const elements = [
    leader,
    ...Array.from(root.querySelectorAll<HTMLElement>('[data-keychain]')).filter(
      (element) => element !== leader && element.querySelector('img'),
    ),
  ].map((element): MemberElement => ({
    id: element.dataset['keychain']!,
    element,
    baseAngle: Number.parseFloat(view.getComputedStyle(element).rotate) || 0,
    originals: ['transform', 'rotate'].map((name) => ({
      name,
      value: element.style.getPropertyValue(name),
      priority: element.style.getPropertyPriority(name),
    })),
  }));
  const restoreMember = ({ element, originals }: MemberElement): void => {
    for (const { name, value, priority } of originals) {
      if (value) element.style.setProperty(name, value, priority);
      else element.style.removeProperty(name);
    }
  };
  const restoreStyles = (): void => elements.forEach(restoreMember);
  gsap.registerPlugin(ScrollTrigger);
  let disposed = false;
  let refreshActive: (() => void) | undefined;
  let media: gsap.MatchMedia | undefined;

  const context = gsap.context(() => {
    media = gsap.matchMedia();
    media.add(
      {
        regular: '(prefers-reduced-motion: no-preference)',
        reduced: animationConfig.reducedMotionQuery,
      },
      (mediaContext) => {
        if (mediaContext.conditions?.['reduced'] || !mediaContext.conditions?.['regular']) {
          clearMotion();
          return;
        }
        const proxy = { progress: 0 };
        let alive = true;
        let suppressRender = true;
        let building = false;
        let hasRendered = false;
        let savedProgress: number | undefined;
        let cache: ScrollCache | undefined;
        let trigger: ScrollTrigger | undefined;

        const render = (value: number, reason: KeychainMotionFrame['reason'] = 'motion'): void => {
          if (disposed || !alive || suppressRender || !cache) return;
          const progress = clamp(value);
          const { route, timing } = cache;
          const origin = route.points[0];
          layout.setProgress(progress);
          const frameMembers: KeychainMotionMember[] | undefined = options.onFrame ? [] : undefined;
          const catchup = smoothstep(
            (progress - timing.catchupProgress) / Math.max(EPSILON, 1 - timing.catchupProgress),
          );
          for (const member of cache.members) {
            const local = clamp(progress - member.lagProgress * (1 - catchup));
            const sampled = sampleKeychainRoute(route, local);
            const ownOrigin = {
              x: member.rect.left + member.rect.width / 2,
              y: member.rect.top + member.rect.height / 2,
            };
            const capture =
              timing.frontProgress > EPSILON ? clamp(local / timing.frontProgress) : 1;
            // Each source joins at hero-front. Offsets disappear before entering the corridors.
            const point = {
              x: sampled.x + (ownOrigin.x - origin.x) * (1 - capture),
              y: sampled.y + (ownOrigin.y - origin.y) * (1 - capture),
            };
            let scale = member.fitScale;
            let angle = 0;
            if (local === 0) {
              scale = 1;
              angle = member.baseAngle;
            } else if (local <= timing.frontProgress && timing.frontProgress > EPSILON) {
              scale = interpolate(1, animationConfig.keychains.frontScale, capture);
              angle = member.baseAngle;
            } else if (local < timing.corridorProgress) {
              const fraction =
                (local - timing.frontProgress) /
                Math.max(EPSILON, timing.corridorProgress - timing.frontProgress);
              scale = interpolate(animationConfig.keychains.frontScale, member.fitScale, fraction);
              angle = interpolate(member.baseAngle, 0, fraction);
            }
            if (local >= timing.arrivalProgress) {
              const formationProgress = clamp(
                (local - timing.arrivalProgress) / Math.max(EPSILON, 1 - timing.arrivalProgress),
              );
              point.x = interpolate(cache.arrival.x, member.slot.x, formationProgress);
              point.y = cache.arrival.y;
              scale *= interpolate(1, cache.formationScale, formationProgress);
            }
            member.element.style.setProperty(
              'transform',
              `translate3d(${point.x - ownOrigin.x}px, ${point.y - ownOrigin.y}px, 0) rotate(${angle}deg) scale(${scale})`,
            );
            frameMembers?.push({
              id: member.id,
              x: point.x,
              y: point.y,
              width: member.rect.width * scale,
              height: member.rect.height * scale,
            });
          }
          if (frameMembers) publishFrame({ progress, reason, members: frameMembers });
        };

        const timeline = gsap.timeline({
          paused: true,
          onUpdate: () => render(proxy.progress),
        });

        const seekPath = (progress: number): void => {
          if (!cache) return;
          timeline.progress(timeForProgress(cache.timing, progress), true);
          proxy.progress = progress;
        };

        const rebuild = (): void => {
          if (!alive || disposed) return;
          const snapshot = layout.getSnapshot();
          suppressRender = true;
          building = true;
          trigger?.getTween()?.kill();
          trigger?.kill(false, true);
          trigger = undefined;
          for (const child of timeline.getChildren()) child.kill();
          timeline.clear().pause(0);
          if (!usable(snapshot)) {
            cache = undefined;
            restoreStyles();
            clearMotion();
            building = false;
            suppressRender = false;
            return;
          }
          const members = travellingMembers(
            elements,
            snapshot.geometry,
            snapshot.route.totalLength,
          );
          const formation = buildKeychainFormation(
            snapshot.geometry.formation,
            members.map((member) => {
              const bounds = travelBounds(member.rect);
              return {
                id: member.id,
                width: bounds.width * member.fitScale,
                height: bounds.height * member.fitScale,
              };
            }),
            {
              clearance: animationConfig.keychains.routeClearancePx,
              gap: snapshot.geometry.footprint.width * animationConfig.keychains.formationGapRatio,
            },
          );
          if (!formation.valid) {
            cache = undefined;
            restoreStyles();
            clearMotion();
            building = false;
            suppressRender = false;
            return;
          }
          const slots = new Map(formation.slots.map((slot) => [slot.id, slot]));
          const activeElements = new Set(members.map((member) => member.element));
          for (const previous of cache?.members ?? []) {
            if (!activeElements.has(previous.element)) restoreMember(previous);
          }
          cache = {
            route: snapshot.route,
            geometry: snapshot.geometry,
            timing: timingFor(snapshot.route),
            members: members.map((member) => ({ ...member, slot: slots.get(member.id)! })),
            formationScale: formation.scale,
            arrival: snapshot.route.points[snapshot.route.points.length - 2],
          };
          // Neutralise it once per build: individual CSS rotate would rotate translation too.
          for (const member of cache.members) member.element.style.setProperty('rotate', 'none');
          proxy.progress = 0;
          for (const segment of cache.timing.segments) {
            timeline.fromTo(
              proxy,
              { progress: segment.from },
              {
                progress: segment.to,
                duration: segment.duration,
                ease: 'none',
                immediateRender: false,
              },
              segment.at,
            );
          }
          const current = cache;
          trigger = ScrollTrigger.create({
            trigger: layoutRoot,
            animation: timeline,
            scrub: animationConfig.keychains.scrub,
            start: () => current.geometry.documentTop,
            end: () => {
              const last = current.route.points[current.route.points.length - 1];
              const maxScroll = Math.max(
                0,
                document.documentElement.scrollHeight - view.innerHeight,
                (document.body?.scrollHeight ?? 0) - view.innerHeight,
              );
              const desired =
                current.geometry.documentTop +
                last.y -
                view.innerHeight * animationConfig.keychains.arrivalViewportRatio;
              return Math.max(current.geometry.documentTop + 1, Math.min(maxScroll, desired));
            },
            onRefreshInit: () => {
              if (building || disposed || !alive) return;
              savedProgress = layout.getSnapshot().progress;
              suppressRender = true;
            },
            onRefresh: (self) => {
              if (building || disposed || !alive || !cache) return;
              const held = savedProgress ?? layout.getSnapshot().progress;
              seekPath(held);
              self.getTween()?.pause();
              savedProgress = undefined;
              suppressRender = false;
              render(held, 'reset');
            },
          });
          if (hasRendered) {
            seekPath(snapshot.progress);
          } else {
            // First mount follows the real scroll location, including deep links/restored routes.
            timeline.progress(trigger.progress, true);
          }
          trigger.getTween()?.pause();
          building = false;
          suppressRender = false;
          render(proxy.progress, 'reset');
          hasRendered = true;
        };

        refreshActive = rebuild;
        rebuild();
        return () => {
          alive = false;
          suppressRender = true;
          refreshActive = undefined;
          trigger?.getTween()?.kill();
          trigger?.kill(false, true);
          timeline.kill();
          restoreStyles();
          clearMotion();
        };
      },
      root,
    );
  }, root);

  return {
    refresh: () => {
      if (!disposed) refreshActive?.();
    },
    destroy: () => {
      if (disposed) return;
      disposed = true;
      media?.revert();
      context.revert();
      restoreStyles();
      clearMotion();
    },
  };
}
