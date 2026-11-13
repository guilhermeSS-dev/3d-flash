import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
} from '@angular/core';
import { AnimationSessionService } from '../../../../core/services/animation-session.service';
import { setupHomeEntrances } from '../../animations/home-entrance.animations';
import { FloatingMenu } from '../../../../shared/components/floating-menu/floating-menu';
import { SectionDivider } from '../../../../shared/components/section-divider/section-divider';
import { HeroSection } from '../../components/hero-section/hero-section';
import { AboutSection } from '../../components/about-section/about-section';
import { CoursePreviewSection } from '../../components/course-preview-section/course-preview-section';
import { ContactSection } from '../../components/contact-section/contact-section';
import { FooterSection } from '../../components/footer-section/footer-section';
import { ElectricTrail } from '../../components/electric-trail/electric-trail';

@Component({
  selector: 'app-home-page',
  imports: [
    HeroSection,
    AboutSection,
    CoursePreviewSection,
    ContactSection,
    FooterSection,
    SectionDivider,
    FloatingMenu,
    ElectricTrail,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly session = inject(AnimationSessionService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private cleanup: () => void = () => {};

  constructor() {
    afterNextRender(() => {
      this.zone.runOutsideAngular(() => {
        this.cleanup = setupHomeEntrances(this.element.nativeElement, (id) =>
          this.session.claimEntrance(id),
        );
      });
    });
    this.destroyRef.onDestroy(() => this.cleanup());
  }
}
