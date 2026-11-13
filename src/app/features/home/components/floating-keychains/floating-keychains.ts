import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
} from '@angular/core';
import { siteAssets } from '../../../../core/config/assets.config';
import { setupKeychainFloat } from '../../animations/keychain-float.animations';
import {
  setupElectricTrail,
  type ElectricTrailController,
} from '../../animations/electric-trail.animations';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  KeychainRouteController,
  setupKeychainRouteLayout,
} from '../../animations/keychain-route-layout';
import {
  KeychainScrollController,
  setupKeychainScroll,
} from '../../animations/keychain-scroll.animations';

@Component({
  selector: 'app-floating-keychains',
  templateUrl: './floating-keychains.html',
  styleUrl: './floating-keychains.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class FloatingKeychains {
  protected readonly keychains = siteAssets.keychains;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private cleanup: () => void = () => {};
  private route: KeychainRouteController | undefined;
  private scroll: KeychainScrollController | undefined;
  private trail: ElectricTrailController | undefined;

  constructor() {
    afterNextRender(() => {
      this.zone.runOutsideAngular(() => {
        const root = this.element.nativeElement;
        const layout = root.closest<HTMLElement>('[data-keychain-layout]');
        const cleanupFloat = setupKeychainFloat(root, layout ?? root);
        if (layout) {
          const svg = layout.querySelector<SVGSVGElement>('[data-electric-trail]');
          if (svg) this.trail = setupElectricTrail(svg, layout);
          this.route = setupKeychainRouteLayout(layout, root, {
            onGeometryChange: () => {
              const snapshot = this.route?.getSnapshot();
              this.trail?.refresh(snapshot?.route?.valid ? snapshot.geometry : undefined);
              this.scroll?.refresh();
              const view = root.ownerDocument.defaultView;
              if (typeof view?.matchMedia !== 'function') return;
              // Layout reservations also move the existing section/case animation triggers.
              gsap.registerPlugin(ScrollTrigger);
              ScrollTrigger.refresh();
            },
          });
          const snapshot = this.route.getSnapshot();
          this.trail?.refresh(snapshot.route?.valid ? snapshot.geometry : undefined);
          this.scroll = setupKeychainScroll(root, layout, this.route, {
            onFrame: (frame) => this.trail?.update(frame),
          });
        }
        this.cleanup = () => {
          this.scroll?.destroy();
          this.trail?.destroy();
          this.route?.destroy();
          cleanupFloat();
        };
      });
    });
    this.destroyRef.onDestroy(() => this.cleanup());
  }
}
