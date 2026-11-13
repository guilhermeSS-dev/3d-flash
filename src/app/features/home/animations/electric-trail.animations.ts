import { gsap } from 'gsap';
import { animationConfig } from '../../../core/config/animation.config';
import { buildElectricBolt } from './electric-bolt.geometry';
import { type KeychainMotionFrame, type KeychainMotionMember } from './keychain-motion.model';
import { type KeychainRouteGeometry } from './keychain-route-layout';
import { type RouteRect } from './keychain-route.geometry';

export interface ElectricTrailController {
  refresh(geometry: KeychainRouteGeometry | undefined): void;
  update(frame: KeychainMotionFrame): void;
  destroy(): void;
}

let instanceId = 0;
const NS = 'http://www.w3.org/2000/svg';

/** Bounded SVG pool. Only numeric motion telemetry can emit; inner floating transforms cannot. */
export function setupElectricTrail(svg: SVGSVGElement, root: HTMLElement): ElectricTrailController {
  const document = svg.ownerDocument;
  const view = document.defaultView;
  if (!view || typeof view.matchMedia !== 'function') {
    return { refresh: () => {}, update: () => {}, destroy: () => {} };
  }
  const config = animationConfig.electricity;
  const identity = `flash-electric-${++instanceId}`;
  const originalViewBox = svg.getAttribute('viewBox');
  const make = <K extends keyof SVGElementTagNameMap>(
    name: K,
    attributes: Record<string, string> = {},
  ) => {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  };
  let geometry: KeychainRouteGeometry | undefined;
  let disposed = false;
  let applyGeometry: (() => void) | undefined;
  let updateActive: ((frame: KeychainMotionFrame) => void) | undefined;
  const context = gsap.context(() => {}, root);
  const media = gsap.matchMedia();
  media.add(
    {
      regular: '(prefers-reduced-motion: no-preference)',
      reduced: animationConfig.reducedMotionQuery,
      colors: '(forced-colors: active)',
    },
    (conditions) => {
      if (
        !conditions.conditions?.['regular'] ||
        conditions.conditions?.['reduced'] ||
        conditions.conditions?.['colors']
      )
        return;
      const defs = make('defs');
      const filter = make('filter', {
        id: `${identity}-glow`,
        x: '-100%',
        y: '-100%',
        width: '300%',
        height: '300%',
      });
      filter.append(make('feGaussianBlur', { stdDeviation: '1.4' }));
      const mask = make('mask', {
        id: `${identity}-mask`,
        maskUnits: 'userSpaceOnUse',
        'mask-type': 'luminance',
      });
      const base = make('rect', { fill: 'white', 'data-electric-mask-base': '' });
      mask.append(base);
      defs.append(filter, mask);
      const layer = make('g', { mask: `url(#${identity}-mask)` });
      svg.append(defs, layer);
      const slots = Array.from({ length: config.maxActiveSegments }, () => {
        const group = make('g', { opacity: '0', 'data-electric-slot': '' });
        const common = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'miter' };
        const halo = make('path', {
          ...common,
          stroke: 'var(--color-lightning)',
          'stroke-width': '4',
          filter: `url(#${identity}-glow)`,
          'data-electric-halo': '',
        });
        const core = make('path', {
          ...common,
          stroke: 'var(--color-lightning)',
          'stroke-width': '1.3',
          'data-electric-core': '',
        });
        const highlight = make('path', {
          ...common,
          stroke: 'var(--color-text)',
          'stroke-width': '0.45',
          'data-electric-highlight': '',
        });
        group.append(halo, core, highlight);
        layer.append(group);
        const opacity = { value: 0 };
        const slot = { group, halo, core, highlight, bounds: undefined as RouteRect | undefined };
        const fade = gsap.fromTo(
          opacity,
          { value: 1 },
          {
            value: 0,
            duration: config.lifetimeSeconds,
            ease: 'power1.out',
            paused: true,
            immediateRender: false,
            onUpdate: () => group.setAttribute('opacity', String(opacity.value)),
            onComplete: () => {
              slot.bounds = undefined;
              updateMaskRegion();
            },
          },
        );
        return Object.assign(slot, { fade });
      });
      let regionSignature = '';
      function updateMaskRegion(): void {
        const active = slots.flatMap((slot) => (slot.bounds ? [slot.bounds] : []));
        const width = geometry?.surface.width ?? 0;
        const height = geometry?.surface.height ?? 0;
        const left = active.length
          ? Math.max(0, Math.floor(Math.min(...active.map((rect) => rect.left))))
          : 0;
        const top = active.length
          ? Math.max(0, Math.floor(Math.min(...active.map((rect) => rect.top))))
          : 0;
        const right = active.length
          ? Math.min(width, Math.ceil(Math.max(...active.map((rect) => rect.left + rect.width))))
          : 0;
        const bottom = active.length
          ? Math.min(height, Math.ceil(Math.max(...active.map((rect) => rect.top + rect.height))))
          : 0;
        const values = [left, top, Math.max(0, right - left), Math.max(0, bottom - top)];
        const signature = values.join(',');
        if (signature === regionSignature) return;
        regionSignature = signature;
        ['x', 'y', 'width', 'height'].forEach((name, index) =>
          mask.setAttribute(name, String(values[index])),
        );
      }
      let previous = new Map<string, KeychainMotionMember>();
      let lastProgress: number | undefined;
      let lastScroll = -Infinity;
      let lastEmission = -Infinity;
      let cursor = 0;
      let memberCursor = 0;
      let seed = 0;
      let visible = true;
      let alive = true;
      const now = () => view.performance.now();
      const clear = () => {
        for (const slot of slots) {
          slot.fade.pause();
          slot.group.setAttribute('opacity', '0');
          slot.bounds = undefined;
        }
        previous.clear();
        lastProgress = undefined;
        lastEmission = -Infinity;
        updateMaskRegion();
      };
      const record = (frame: KeychainMotionFrame) => {
        previous = new Map(frame.members.map((member) => [member.id, member]));
        lastProgress = frame.progress;
      };
      const refresh = () => {
        clear();
        for (const rect of Array.from(mask.querySelectorAll('[data-electric-obstacle]')))
          rect.remove();
        if (!geometry) return;
        const { width, height } = geometry.surface;
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        base.setAttribute('width', String(width));
        base.setAttribute('height', String(height));
        const pad = config.protectionPaddingPx;
        for (const rect of geometry.obstacles)
          mask.append(
            make('rect', {
              x: String(rect.left - pad),
              y: String(rect.top - pad),
              width: String(rect.width + pad * 2),
              height: String(rect.height + pad * 2),
              fill: 'black',
              'data-electric-obstacle': '',
            }),
          );
      };
      applyGeometry = refresh;
      updateActive = (frame) => {
        if (!alive || disposed) return;
        if (frame.reason === 'reset') {
          clear();
          record(frame);
          return;
        }
        const time = now();
        if (!geometry || !visible || document.visibilityState === 'hidden') {
          clear();
          record(frame);
          return;
        }
        if (time - lastScroll > config.nativeScrollGraceSeconds * 1000) {
          // Stop emitting, but let existing flashes complete their short fade.
          record(frame);
          return;
        }
        if (lastProgress === undefined) {
          record(frame);
          return;
        }
        if (Math.abs(frame.progress - lastProgress) < 1e-8) return;
        if (time - lastEmission < config.minEmissionIntervalSeconds * 1000) return;
        let emitted = 0;
        const members = frame.members;
        for (
          let attempt = 0;
          attempt < members.length && emitted < config.maxEmissionsPerFrame;
          attempt++
        ) {
          const member = members[(memberCursor + attempt) % members.length];
          const from = previous.get(member.id);
          if (!from) {
            previous.set(member.id, member);
            continue;
          }
          if (Math.hypot(member.x - from.x, member.y - from.y) < config.minMovementPx) continue;
          const dx = member.x - from.x;
          const dy = member.y - from.y;
          const distance = Math.hypot(dx, dy);
          // Keep the discharge behind the visible silhouette, including on slow scroll.
          const rear = Math.hypot(member.width, member.height) / 2 + 3;
          const head = {
            x: member.x - (dx / distance) * rear,
            y: member.y - (dy / distance) * rear,
          };
          const length = Math.min(config.maxLengthPx, Math.max(24, distance));
          const tail = {
            x: head.x - (dx / distance) * length,
            y: head.y - (dy / distance) * length,
          };
          const bolt = buildElectricBolt(tail, head, {
            seed: ++seed,
            maxLength: Math.min(config.maxLengthPx, Math.max(24, member.width * 1.6)),
            amplitude: config.amplitudePx,
          });
          if (!bolt.valid) continue;
          const slot = slots[cursor++ % slots.length];
          const path = [bolt.path, ...bolt.branches].join(' ');
          slot.halo.setAttribute('d', path);
          slot.core.setAttribute('d', path);
          slot.highlight.setAttribute('d', path);
          // Include angular detours, stroke miters and the local blur without rasterizing the page.
          const margin = config.amplitudePx + 20;
          slot.bounds = {
            left: Math.min(tail.x, head.x) - margin,
            top: Math.min(tail.y, head.y) - margin,
            width: Math.abs(tail.x - head.x) + margin * 2,
            height: Math.abs(tail.y - head.y) + margin * 2,
          };
          slot.group.setAttribute('opacity', '1');
          slot.fade.restart(true, true);
          previous.set(member.id, member);
          emitted++;
        }
        if (emitted) updateMaskRegion();
        memberCursor = members.length ? (memberCursor + Math.max(1, emitted)) % members.length : 0;
        if (emitted) lastEmission = time;
        // Keep per-member anchors until emission so subpixel scroll can accumulate.
        lastProgress = frame.progress;
      };
      const scroll = () => {
        lastScroll = now();
      };
      const scrollEnd = () => {
        lastScroll = -Infinity;
      };
      const visibility = () => {
        if (document.visibilityState === 'hidden') {
          lastScroll = -Infinity;
          clear();
        }
      };
      const observer =
        typeof view.IntersectionObserver === 'function'
          ? new view.IntersectionObserver((entries) => {
              const entry = entries.find((item) => item.target === root);
              if (!alive || !entry) return;
              visible = entry.isIntersecting;
              if (!visible) {
                lastScroll = -Infinity;
                clear();
              }
            })
          : undefined;
      observer?.observe(root);
      view.addEventListener('scroll', scroll, { passive: true });
      view.addEventListener('scrollend', scrollEnd, { passive: true });
      document.addEventListener('visibilitychange', visibility);
      refresh();
      return () => {
        alive = false;
        clear();
        observer?.disconnect();
        view.removeEventListener('scroll', scroll);
        view.removeEventListener('scrollend', scrollEnd);
        document.removeEventListener('visibilitychange', visibility);
        slots.forEach((slot) => slot.fade.kill());
        defs.remove();
        layer.remove();
        updateActive = undefined;
        applyGeometry = undefined;
      };
    },
    root,
  );
  return {
    refresh: (next) => {
      if (disposed) return;
      geometry =
        next &&
        [next.surface.width, next.surface.height].every(
          (value) => Number.isFinite(value) && value > 0,
        ) &&
        next.obstacles.every(
          (rect) =>
            [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) &&
            rect.width > 0 &&
            rect.height > 0,
        )
          ? next
          : undefined;
      applyGeometry?.();
    },
    update: (frame) => {
      if (!disposed) updateActive?.(frame);
    },
    destroy: () => {
      if (disposed) return;
      disposed = true;
      media.revert();
      context.revert();
      if (originalViewBox === null) svg.removeAttribute('viewBox');
      else svg.setAttribute('viewBox', originalViewBox);
    },
  };
}
