import { animationConfig } from '../../../core/config/animation.config';
import {
  buildKeychainRoute,
  sampleKeychainRoute,
  type KeychainRoute,
  type KeychainRouteInput,
  type RouteRect,
  type RouteSize,
} from './keychain-route.geometry';

export interface KeychainMemberGeometry {
  readonly id: string;
  readonly rect: RouteRect;
}

export interface KeychainRouteGeometry {
  readonly surface: RouteSize;
  readonly obstacles: readonly RouteRect[];
  readonly footprint: RouteSize;
  readonly leader: RouteRect;
  readonly members: readonly KeychainMemberGeometry[];
  readonly formation: RouteRect;
  readonly documentTop: number;
}

export interface KeychainRouteSnapshot {
  readonly route: KeychainRoute | null;
  readonly progress: number;
  /** Nominal point on the central route; individual row slots are resolved by the driver. */
  readonly position: { readonly x: number; readonly y: number } | null;
  readonly geometry?: KeychainRouteGeometry;
}

export interface KeychainRouteController {
  getSnapshot(): KeychainRouteSnapshot;
  setProgress(progress: number): void;
  refresh(): void;
  destroy(): void;
}

export interface KeychainRouteLayoutOptions {
  /** Called after the geometry cache changes, never for a progress-only update. */
  readonly onGeometryChange?: () => void;
}

interface LayoutNodes {
  readonly hero: HTMLElement;
  readonly about: HTMLElement;
  readonly course: HTMLElement;
  readonly contact: HTMLElement;
  readonly scene: HTMLElement;
  readonly formation: HTMLElement;
  readonly leader: HTMLElement;
  readonly members: HTMLElement[];
  readonly obstacles: HTMLElement[];
}

const cssProperties = {
  corridor: '--keychain-route-corridor',
  beforeCourse: '--keychain-before-course',
  beforeContact: '--keychain-before-contact',
  arrivalHeight: '--keychain-arrival-height',
} as const;

function normalizeProgress(value: number): number {
  return typeof value !== 'number' || Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));
}

/** Layout coordinates deliberately ignore transient entrance transforms. */
function layoutRect(element: HTMLElement, root: HTMLElement): RouteRect {
  if (element === root) {
    const rect = root.getBoundingClientRect();
    return {
      left: 0,
      top: 0,
      width: root.offsetWidth || rect.width,
      height: root.offsetHeight || rect.height,
    };
  }

  let left = 0;
  let top = 0;
  let current: HTMLElement | null = element;
  const visited = new Set<HTMLElement>();
  while (current && current !== root && !visited.has(current)) {
    visited.add(current);
    left += current.offsetLeft;
    top += current.offsetTop;
    const parent = current.offsetParent as HTMLElement | null;
    if (parent) {
      left += parent.clientLeft;
      top += parent.clientTop;
    }
    current = parent;
  }

  if (current === root) {
    return { left, top, width: element.offsetWidth, height: element.offsetHeight };
  }

  const rect = element.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  return {
    left: rect.left - rootRect.left,
    top: rect.top - rootRect.top,
    width: element.offsetWidth || rect.width,
    height: element.offsetHeight || rect.height,
  };
}

function collectNodes(layoutRoot: HTMLElement, originRoot: HTMLElement): LayoutNodes | null {
  const hero = layoutRoot.querySelector<HTMLElement>('#inicio');
  const about = layoutRoot.querySelector<HTMLElement>('#sobre');
  const course = layoutRoot.querySelector<HTMLElement>('#curso');
  const contact = layoutRoot.querySelector<HTMLElement>('#contato');
  const scene = layoutRoot.querySelector<HTMLElement>('[data-keychain-origin-surface]');
  const formation = layoutRoot.querySelector<HTMLElement>('[data-keychain-formation]');
  const members = Array.from(originRoot.querySelectorAll<HTMLElement>('[data-keychain]')).filter(
    (element) => element.dataset['keychain'] && element.querySelector('img'),
  );
  const leader =
    members.find((element) => element.dataset['keychain'] === 'ro-modas') ?? members[0];

  if (!hero || !about || !course || !contact || !scene || !formation || !leader) return null;
  return {
    hero,
    about,
    course,
    contact,
    scene,
    formation,
    leader,
    members,
    obstacles: Array.from(layoutRoot.querySelectorAll<HTMLElement>('[data-keychain-obstacle]')),
  };
}

/**
 * Cached geometry for the scroll driver. No DOM measurements occur in setProgress().
 * Responsive spacing is resolved in two layout passes, only on explicit layout invalidation.
 */
export function setupKeychainRouteLayout(
  layoutRoot: HTMLElement,
  originRoot: HTMLElement,
  options: KeychainRouteLayoutOptions = {},
): KeychainRouteController {
  const document = layoutRoot.ownerDocument;
  const view = document.defaultView;
  const originals = Object.values(cssProperties).map((name) => ({
    name,
    value: layoutRoot.style.getPropertyValue(name),
    priority: layoutRoot.style.getPropertyPriority(name),
  }));
  let route: KeychainRoute | null = null;
  let progress = 0;
  let position: KeychainRouteSnapshot['position'] = null;
  let geometry: KeychainRouteGeometry | undefined;
  let disposed = false;
  let pendingFrame: number | null = null;
  let pendingIsTimeout = false;
  let signature = 'null';
  let observer: ResizeObserver | undefined;
  const observed = new Set<HTMLElement>();

  const updatePosition = (): void => {
    position = route?.valid ? sampleKeychainRoute(route, progress) : null;
  };

  const setPixels = (name: string, value: number): void => {
    const pixels = `${Math.max(0, Math.ceil(Number.isFinite(value) ? value : 0))}px`;
    if (
      layoutRoot.style.getPropertyValue(name) !== pixels ||
      layoutRoot.style.getPropertyPriority(name)
    ) {
      layoutRoot.style.setProperty(name, pixels);
    }
  };

  const appliedPixels = (name: string): number => {
    const value = Number.parseFloat(layoutRoot.style.getPropertyValue(name));
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };

  const cancelScheduledRefresh = (): void => {
    if (pendingFrame === null || !view) return;
    if (pendingIsTimeout) view.clearTimeout(pendingFrame);
    else view.cancelAnimationFrame(pendingFrame);
    pendingFrame = null;
  };

  const publish = (
    next: KeychainRoute | null,
    metrics?: object,
    nextGeometry?: KeychainRouteGeometry,
  ): void => {
    route = next;
    geometry = nextGeometry;
    updatePosition();
    const nextSignature = next ? JSON.stringify({ ...metrics, route: next, geometry }) : 'null';
    if (nextSignature !== signature) {
      signature = nextSignature;
      options.onGeometryChange?.();
    }
  };

  const syncObservedNodes = (nodes?: LayoutNodes): void => {
    if (!observer) return;
    const next = new Set<HTMLElement>([layoutRoot, originRoot]);
    if (nodes) {
      for (const element of [
        nodes.hero,
        nodes.about,
        nodes.course,
        nodes.contact,
        nodes.scene,
        nodes.formation,
        ...nodes.members,
        ...nodes.obstacles,
      ]) {
        next.add(element);
      }
    }
    for (const element of observed) {
      if (!next.has(element)) {
        observer.unobserve(element);
        observed.delete(element);
      }
    }
    for (const element of next) {
      if (!observed.has(element)) {
        observer.observe(element);
        observed.add(element);
      }
    }
  };

  const measureInput = (
    nodes: LayoutNodes,
    width: number,
    footprint: KeychainRouteInput['footprint'],
    clearance: number,
    corridor: number,
  ): KeychainRouteInput => {
    const leader = layoutRect(nodes.leader, layoutRoot);
    const sectionIds = {
      inicio: 'hero',
      sobre: 'about',
      curso: 'course',
      contato: 'contact',
    } as const;
    const obstacles: KeychainRouteInput['obstacles'][number][] = [];
    for (const element of nodes.obstacles) {
      const id = element.closest<HTMLElement>('section')?.id as keyof typeof sectionIds | undefined;
      const section = id ? sectionIds[id] : undefined;
      if (!section) continue;
      const rect = layoutRect(element, layoutRoot);
      if (rect.width > 0 && rect.height > 0) {
        obstacles.push({ id: element.dataset['keychainObstacle'] || section, section, rect });
      }
    }
    return {
      width,
      origin: { x: leader.left + leader.width / 2, y: leader.top + leader.height / 2 },
      heroScene: layoutRect(nodes.scene, layoutRoot),
      sections: {
        hero: layoutRect(nodes.hero, layoutRoot),
        about: layoutRect(nodes.about, layoutRoot),
        course: layoutRect(nodes.course, layoutRoot),
        contact: layoutRect(nodes.contact, layoutRoot),
      },
      formation: layoutRect(nodes.formation, layoutRoot),
      obstacles,
      footprint,
      clearance,
      corridor,
    };
  };

  const refresh = (): void => {
    if (disposed || !view) return;
    cancelScheduledRefresh();
    const nodes = collectNodes(layoutRoot, originRoot);
    syncObservedNodes(nodes ?? undefined);
    const bounds = layoutRect(layoutRoot, layoutRoot);
    if (
      !nodes ||
      !Number.isFinite(bounds.width) ||
      !Number.isFinite(bounds.height) ||
      bounds.width <= 0 ||
      bounds.height <= 0
    ) {
      publish(null);
      return;
    }

    const config = animationConfig.keychains;
    const width = bounds.width;
    const footprintWidth = Math.min(
      config.routeWidthMaxPx,
      Math.max(config.routeWidthMinPx, width * config.routeWidthRatio),
    );
    const footprint = {
      width: footprintWidth,
      height: footprintWidth * config.routeHeightRatio + 2 * config.floatDistancePx,
    };
    const clearance = config.routeClearancePx;
    const corridor = Math.ceil(footprint.width + 2 * clearance);

    // Remove previous additions mathematically, without temporarily shrinking the page.
    // A real reset to zero can clamp scrollY near the document end during measurement.
    setPixels(cssProperties.corridor, corridor);
    const current = measureInput(nodes, width, footprint, clearance, corridor);
    const beforeCourse = appliedPixels(cssProperties.beforeCourse);
    const beforeContact = appliedPixels(cssProperties.beforeContact);
    const shift = (rect: RouteRect, amount: number): RouteRect => ({
      ...rect,
      top: rect.top - amount,
    });
    const baseInput: KeychainRouteInput = {
      ...current,
      sections: {
        ...current.sections,
        course: shift(current.sections.course, beforeCourse),
        contact: shift(current.sections.contact, beforeCourse + beforeContact),
      },
      formation: shift(current.formation, beforeCourse + beforeContact),
      obstacles: current.obstacles.map((obstacle) => ({
        ...obstacle,
        rect: shift(
          obstacle.rect,
          obstacle.section === 'course'
            ? beforeCourse
            : obstacle.section === 'contact'
              ? beforeCourse + beforeContact
              : 0,
        ),
      })),
    };
    const base = buildKeychainRoute(baseInput);
    const spacing = base.requiredSpacing;
    setPixels(cssProperties.beforeCourse, spacing.beforeCourse);
    setPixels(cssProperties.beforeContact, spacing.beforeContact);
    setPixels(cssProperties.arrivalHeight, spacing.formationHeight);

    const finalInput = measureInput(nodes, width, footprint, clearance, corridor);
    const measured = buildKeychainRoute(finalInput);
    publish(
      measured,
      { width, footprint, clearance, corridor, spacing },
      {
        surface: { width, height: layoutRect(layoutRoot, layoutRoot).height },
        obstacles: finalInput.obstacles.map((obstacle) => obstacle.rect),
        footprint,
        leader: layoutRect(nodes.leader, layoutRoot),
        members: nodes.members.map((element) => ({
          id: element.dataset['keychain']!,
          rect: layoutRect(element, layoutRoot),
        })),
        formation: layoutRect(nodes.formation, layoutRoot),
        documentTop: layoutRoot.getBoundingClientRect().top + view.scrollY,
      },
    );
  };

  const scheduleRefresh = (): void => {
    if (disposed || pendingFrame !== null || !view) return;
    const callback = (): void => {
      pendingFrame = null;
      refresh();
    };
    pendingIsTimeout = typeof view.requestAnimationFrame !== 'function';
    pendingFrame = pendingIsTimeout
      ? view.setTimeout(callback, 0)
      : view.requestAnimationFrame(callback);
  };

  if (view && typeof view.ResizeObserver === 'function') {
    observer = new view.ResizeObserver(scheduleRefresh);
  }
  view?.addEventListener('resize', scheduleRefresh, { passive: true });
  view?.addEventListener('orientationchange', scheduleRefresh, { passive: true });
  layoutRoot.addEventListener('load', scheduleRefresh, true);
  const fonts = document.fonts as FontFaceSet | undefined;
  fonts?.addEventListener('loadingdone', scheduleRefresh);
  void fonts?.ready.then(scheduleRefresh, () => {});
  refresh();

  return {
    getSnapshot: () =>
      geometry ? { route, progress, position, geometry } : { route, progress, position },
    setProgress: (value) => {
      if (disposed) return;
      progress = normalizeProgress(value);
      updatePosition();
    },
    refresh,
    destroy: () => {
      if (disposed) return;
      disposed = true;
      cancelScheduledRefresh();
      observer?.disconnect();
      observed.clear();
      view?.removeEventListener('resize', scheduleRefresh);
      view?.removeEventListener('orientationchange', scheduleRefresh);
      layoutRoot.removeEventListener('load', scheduleRefresh, true);
      fonts?.removeEventListener('loadingdone', scheduleRefresh);
      for (const { name, value, priority } of originals) {
        if (value) layoutRoot.style.setProperty(name, value, priority);
        else layoutRoot.style.removeProperty(name);
      }
    },
  };
}
