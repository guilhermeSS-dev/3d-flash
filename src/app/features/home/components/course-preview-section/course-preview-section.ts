import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, computed, inject, signal, viewChild,
} from '@angular/core';
import { siteAssets } from '../../../../core/config/assets.config';
import { siteConfig } from '../../../../core/config/site.config';
import { CourseAccordion } from '../../../course/components/course-accordion/course-accordion';
import { CourseInfo } from '../../../course/components/course-info/course-info';
import { EnrollmentButton } from '../../../course/components/enrollment-button/enrollment-button';
import { courseCatalog } from '../../../course/data/course.data';

type CourseId = keyof typeof courseCatalog;
interface CourseCard { readonly id: CourseId; readonly label: string; readonly image: string; readonly alt: string; }

@Component({
  selector: 'app-course-preview-section',
  imports: [CourseInfo, CourseAccordion, EnrollmentButton],
  templateUrl: './course-preview-section.html',
  styleUrl: './course-preview-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursePreviewSection {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('courseDialog');
  private readonly modalBanner = viewChild<ElementRef<HTMLImageElement>>('modalBannerImage');
  private originImage: HTMLImageElement | null = null;
  private isTransitioning = false;
  private readonly transitionDuration = 520;
  private readonly transitionEasing = 'cubic-bezier(0.22, 0.75, 0.25, 1)';

  protected readonly assets = siteAssets;
  protected readonly config = siteConfig;
  protected readonly courses: readonly CourseCard[] = [
    { id: 'iniciante', label: 'o curso para iniciantes', image: siteAssets.courses.beginner, alt: 'Banner do curso de impressão 3D para iniciantes' },
    { id: 'modelagem', label: 'o curso de modelagem', image: siteAssets.courses.modeling, alt: 'Banner do curso de modelagem 3D' },
  ];
  protected readonly selectedCourseId = signal<CourseId | null>(null);
  protected readonly selectedCourse = computed(() => {
    const id = this.selectedCourseId();
    return id ? courseCatalog[id] : null;
  });
  protected readonly selectedCourseImage = computed(
    () => this.courses.find((course) => course.id === this.selectedCourseId())?.image ?? '',
  );
  protected readonly selectedCourseAlt = computed(
    () => this.courses.find((course) => course.id === this.selectedCourseId())?.alt ?? '',
  );

  protected async openCourse(courseId: CourseId, event: MouseEvent): Promise<void> {
    if (this.isTransitioning || this.selectedCourseId()) return;
    const trigger = event.currentTarget;
    const source = trigger instanceof HTMLElement ? trigger.querySelector('img') : null;
    if (!source) {
      this.selectedCourseId.set(courseId);
      this.changeDetector.detectChanges();
      this.dialog()?.nativeElement.showModal();
      return;
    }

    this.isTransitioning = true;
    this.originImage = source;
    const sourceRect = source.getBoundingClientRect();
    const sourceStyle = getComputedStyle(source);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.selectedCourseId.set(courseId);
    this.changeDetector.detectChanges();

    const dialog = this.dialog()?.nativeElement;
    const destination = this.modalBanner()?.nativeElement;
    if (!dialog || !destination) {
      this.isTransitioning = false;
      this.originImage = null;
      return;
    }

    dialog.showModal();
    this.changeDetector.detectChanges();
    const destinationRect = destination.getBoundingClientRect();
    if (reducedMotion || !sourceRect.width || !destinationRect.width) {
      this.isTransitioning = false;
      return;
    }

    source.style.visibility = 'hidden';
    destination.style.opacity = '0';
    const layer = this.createTransitionLayer(false);
    const movingImage = this.createMovingImage(layer, source, sourceRect, sourceStyle.objectFit, sourceStyle.objectPosition);
    layer.showModal();
    const animation = movingImage.animate(
      [this.transformFrame(0, 0, 1, 1), this.transformFrame(
        destinationRect.left - sourceRect.left, destinationRect.top - sourceRect.top,
        destinationRect.width / sourceRect.width, destinationRect.height / sourceRect.height,
      )],
      { duration: this.transitionDuration, easing: this.transitionEasing, fill: 'forwards' },
    );

    try { await animation.finished; } catch { /* Clean up if interrupted. */ }
    finally {
      layer.close();
      layer.remove();
      source.style.visibility = '';
      destination.style.opacity = '';
      this.isTransitioning = false;
    }
  }

  protected async closeCourse(): Promise<void> {
    if (this.isTransitioning || !this.selectedCourseId()) return;
    const dialog = this.dialog()?.nativeElement;
    const destination = this.modalBanner()?.nativeElement;
    const source = this.originImage;
    if (!dialog || !destination || !source) {
      dialog?.close();
      this.selectedCourseId.set(null);
      this.changeDetector.detectChanges();
      return;
    }

    this.isTransitioning = true;
    const destinationRect = destination.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    const destinationStyle = getComputedStyle(destination);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !sourceRect.width || !destinationRect.width) {
      dialog.close();
      this.selectedCourseId.set(null);
      this.changeDetector.detectChanges();
      this.isTransitioning = false;
      this.originImage = null;
      return;
    }

    const layer = this.createTransitionLayer(true);
    const movingImage = this.createMovingImage(layer, destination, destinationRect, destinationStyle.objectFit, destinationStyle.objectPosition);
    destination.style.opacity = '0';
    source.style.visibility = 'hidden';
    layer.showModal();
    dialog.close();
    this.selectedCourseId.set(null);
    this.changeDetector.detectChanges();

    const imageAnimation = movingImage.animate(
      [this.transformFrame(0, 0, 1, 1), this.transformFrame(
        sourceRect.left - destinationRect.left, sourceRect.top - destinationRect.top,
        sourceRect.width / destinationRect.width, sourceRect.height / destinationRect.height,
      )],
      { duration: this.transitionDuration, easing: this.transitionEasing, fill: 'forwards' },
    );
    const backdropAnimation = layer.animate(
      [{ backgroundColor: 'rgba(0, 0, 0, 0.72)' }, { backgroundColor: 'rgba(0, 0, 0, 0)' }],
      { duration: this.transitionDuration, easing: this.transitionEasing, fill: 'forwards' },
    );
    try { await Promise.all([imageAnimation.finished, backdropAnimation.finished]); }
    catch { /* Clean up even if the browser cancels an animation. */ }
    finally {
      layer.close();
      layer.remove();
      source.style.visibility = '';
      this.originImage = null;
      this.isTransitioning = false;
    }
  }

  protected onDialogClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) void this.closeCourse();
  }
  protected onDialogCancel(event: Event): void {
    event.preventDefault();
    void this.closeCourse();
  }

  private createTransitionLayer(withBackdrop: boolean): HTMLDialogElement {
    const layer = document.createElement('dialog');
    layer.setAttribute('aria-hidden', 'true');
    Object.assign(layer.style, {
      position: 'fixed', inset: '0', width: '100vw', height: '100dvh',
      maxWidth: 'none', maxHeight: 'none', margin: '0', padding: '0',
      border: '0', overflow: 'visible', pointerEvents: 'none',
      backgroundColor: withBackdrop ? 'rgba(0, 0, 0, 0.72)' : 'transparent',
      backdropFilter: withBackdrop ? 'blur(8px)' : 'none',
    });
    document.body.append(layer);
    return layer;
  }

  private createMovingImage(
    layer: HTMLDialogElement, reference: HTMLImageElement, rect: DOMRect,
    objectFit: string, objectPosition: string,
  ): HTMLImageElement {
    const image = document.createElement('img');
    image.src = reference.currentSrc || reference.src;
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    Object.assign(image.style, {
      position: 'fixed', inset: '0 auto auto 0',
      width: `${rect.width}px`, height: `${rect.height}px`,
      objectFit, objectPosition, margin: '0', pointerEvents: 'none',
      zIndex: '1', transformOrigin: 'top left', willChange: 'transform',
      borderRadius: getComputedStyle(reference).borderRadius,
    });
    image.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
    layer.append(image);
    return image;
  }

  private transformFrame(x: number, y: number, scaleX: number, scaleY: number): Keyframe {
    return { transform: `translate3d(${x}px, ${y}px, 0) scale(${scaleX}, ${scaleY})` };
  }
}
