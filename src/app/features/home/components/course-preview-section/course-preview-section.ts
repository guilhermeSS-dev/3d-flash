import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { siteAssets } from '../../../../core/config/assets.config';
import { siteConfig } from '../../../../core/config/site.config';
import { CourseAccordion } from '../../../course/components/course-accordion/course-accordion';
import { CourseInfo } from '../../../course/components/course-info/course-info';
import { EnrollmentButton } from '../../../course/components/enrollment-button/enrollment-button';
import { courseCatalog } from '../../../course/data/course.data';

type CourseId = keyof typeof courseCatalog;
interface CourseCard {
  readonly id: CourseId;
  readonly label: string;
  readonly image: string;
  readonly alt: string;
  readonly panorama: string;
}

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
    {
      id: 'iniciante',
      label: 'o curso para iniciantes',
      image: siteAssets.courses.beginner,
      alt: 'Banner do curso de impressão 3D para iniciantes',
      panorama: 'assets/images/courses/iniciante-panorama.png',
    },
    {
      id: 'modelagem',
      label: 'o curso de modelagem',
      image: siteAssets.courses.modeling,
      alt: 'Banner do curso de modelagem 3D',
      panorama: 'assets/images/courses/modelagem-panorama.png',
    },
  ];
  protected readonly selectedCourseId = signal<CourseId | null>(null);
  protected readonly panoramaSource = signal('');
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

  /** Only use a panorama after successful decoding. Missing assets fall back to the card artwork. */
  private async resolvePanorama(courseId: CourseId): Promise<string> {
    const course = this.courses.find((item) => item.id === courseId);
    if (!course) return '';
    const image = new Image();
    image.src = course.panorama;
    try {
      await image.decode();
      return image.currentSrc || image.src;
    } catch {
      return course.image;
    }
  }

  protected async openCourse(courseId: CourseId, event: MouseEvent): Promise<void> {
    if (this.isTransitioning || this.selectedCourseId()) return;
    this.isTransitioning = true;
    const trigger = event.currentTarget;
    const source = trigger instanceof HTMLElement ? trigger.querySelector('img') : null;
    this.originImage = source;
    const sourceRect = source ? this.getRenderedImageRect(source) : null;
    const panorama = await this.resolvePanorama(courseId);
    this.panoramaSource.set(panorama);
    this.selectedCourseId.set(courseId);
    this.changeDetector.detectChanges();

    const dialog = this.dialog()?.nativeElement;
    const destination = this.modalBanner()?.nativeElement;
    if (!dialog || !destination) {
      this.isTransitioning = false;
      this.originImage = null;
      this.selectedCourseId.set(null);
      this.changeDetector.detectChanges();
      return;
    }

    dialog.showModal();
    dialog.focus({ preventScroll: true });
    this.changeDetector.detectChanges();
    const destinationRect = this.getRenderedImageRect(destination);
    if (!source || !sourceRect || this.reducedMotion() || !this.validRect(sourceRect) || !this.validRect(destinationRect)) {
      this.isTransitioning = false;
      return;
    }

    const layer = this.createTransitionLayer(false);
    source.style.visibility = 'hidden';
    destination.style.opacity = '0';
    try {
      const original = this.createMovingImage(layer, source, sourceRect);
      const panoramic = this.createMovingImage(layer, destination, destinationRect);
      panoramic.style.opacity = '0';
      layer.showModal();
      const endOriginal = this.fitRect(sourceRect.width / sourceRect.height, destinationRect);
      const beginPanorama = this.fitRect(destinationRect.width / destinationRect.height, sourceRect);
      await Promise.all([
        this.animateRect(original, sourceRect, endOriginal, [1, 1, 0], [0, 0.25, 1]),
        this.animateRect(panoramic, beginPanorama, destinationRect, [0, 0, 1], [0, 0.25, 1]),
      ]);
    } catch {
      // Always reveal the definitive modal even if the animation is interrupted.
    } finally {
      if (layer.open) layer.close();
      layer.remove();
      source.style.visibility = '';
      destination.style.opacity = '';
      this.isTransitioning = false;
    }
  }

  protected async closeCourse(): Promise<void> {
    if (this.isTransitioning || !this.selectedCourseId()) return;
    this.isTransitioning = true;
    const dialog = this.dialog()?.nativeElement;
    const destination = this.modalBanner()?.nativeElement;
    const source = this.originImage;
    const sourceRect = source ? this.getRenderedImageRect(source) : null;
    const destinationRect = destination ? this.getRenderedImageRect(destination) : null;
    const visibleSource = sourceRect && sourceRect.bottom > 0 && sourceRect.top < innerHeight &&
      sourceRect.right > 0 && sourceRect.left < innerWidth;
    if (!dialog || !destination || !source || !sourceRect || !destinationRect ||
        !visibleSource || this.reducedMotion() || !this.validRect(sourceRect) || !this.validRect(destinationRect)) {
      dialog?.close();
      this.selectedCourseId.set(null);
      this.panoramaSource.set('');
      this.changeDetector.detectChanges();
      this.originImage = null;
      this.isTransitioning = false;
      return;
    }

    const layer = this.createTransitionLayer(true);
    source.style.visibility = 'hidden';
    destination.style.opacity = '0';
    try {
      const panoramic = this.createMovingImage(layer, destination, destinationRect);
      const original = this.createMovingImage(layer, source, sourceRect);
      original.style.opacity = '0';
      layer.showModal();
      dialog.close();
      this.selectedCourseId.set(null);
      this.changeDetector.detectChanges();
      const endPanorama = this.fitRect(destinationRect.width / destinationRect.height, sourceRect);
      const beginOriginal = this.fitRect(sourceRect.width / sourceRect.height, destinationRect);
      await Promise.all([
        this.animateRect(panoramic, destinationRect, endPanorama, [1, 0, 0], [0, 0.75, 1]),
        this.animateRect(original, beginOriginal, sourceRect, [0, 1, 1], [0, 0.75, 1]),
        layer.animate(
          [{ backgroundColor: 'rgba(0,0,0,.72)' }, { backgroundColor: 'rgba(0,0,0,0)' }],
          { duration: this.transitionDuration, easing: this.transitionEasing, fill: 'forwards' },
        ).finished,
      ]);
    } catch {
      // Restore visibility and state regardless of interruption.
    } finally {
      if (layer.open) layer.close();
      layer.remove();
      source.style.visibility = '';
      destination.style.opacity = '';
      this.originImage = null;
      this.panoramaSource.set('');
      this.isTransitioning = false;
    }
  }

  private reducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private validRect(rect: DOMRect): boolean {
    return rect.width > 0 && rect.height > 0;
  }

  private fitRect(aspect: number, bounds: DOMRect): DOMRect {
    const width = Math.min(bounds.width, bounds.height * aspect);
    const height = width / aspect;
    return new DOMRect(bounds.left + (bounds.width - width) / 2,
      bounds.top + (bounds.height - height) / 2, width, height);
  }

  private animateRect(image: HTMLImageElement, from: DOMRect, to: DOMRect,
    opacity: number[], offset: number[]): Promise<Animation> {
    const animation = image.animate([
      { transform: this.transformFrame(from.left, from.top, 1).transform, opacity: opacity[0], offset: offset[0] },
      { transform: this.transformFrame(
          from.left + (to.left - from.left) * 0.25,
          from.top + (to.top - from.top) * 0.25,
          1 + (to.width / from.width - 1) * 0.25,
        ).transform, opacity: opacity[1], offset: offset[1] },
      { transform: this.transformFrame(to.left, to.top, to.width / from.width).transform,
        opacity: opacity[2], offset: offset[2] },
    ], { duration: this.transitionDuration, easing: this.transitionEasing, fill: 'forwards' });
    return animation.finished;
  }

  protected onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab')
      (event.currentTarget as HTMLElement).classList.add('course-modal--keyboard');
  }

  protected onDialogPointerDown(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).classList.remove('course-modal--keyboard');
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
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100dvh',
      maxWidth: 'none',
      maxHeight: 'none',
      margin: '0',
      padding: '0',
      border: '0',
      overflow: 'visible',
      pointerEvents: 'none',
      outline: 'none',
      backgroundColor: withBackdrop ? 'rgba(0, 0, 0, 0.72)' : 'transparent',
      backdropFilter: withBackdrop ? 'blur(8px)' : 'none',
    });
    document.body.append(layer);
    return layer;
  }

  /**
   * Measures the visible image pixels, not the potentially letterboxed <img> box.
   * This keeps the animated clone at the same aspect ratio in both endpoints.
   */
  private getRenderedImageRect(element: HTMLImageElement): DOMRect {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const naturalWidth = element.naturalWidth || box.width;
    const naturalHeight = element.naturalHeight || box.height;

    if (
      !box.width ||
      !box.height ||
      !naturalWidth ||
      !naturalHeight ||
      style.objectFit !== 'contain'
    ) {
      return box;
    }

    const fitScale = Math.min(box.width / naturalWidth, box.height / naturalHeight);
    const width = naturalWidth * fitScale;
    const height = naturalHeight * fitScale;

    // Both the card image and modal banner use centered object positioning.
    return new DOMRect(
      box.left + (box.width - width) / 2,
      box.top + (box.height - height) / 2,
      width,
      height,
    );
  }

  private createMovingImage(
    layer: HTMLDialogElement,
    reference: HTMLImageElement,
    rect: DOMRect,
  ): HTMLImageElement {
    const image = document.createElement('img');
    image.src = reference.currentSrc || reference.src;
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    Object.assign(image.style, {
      position: 'fixed',
      inset: '0 auto auto 0',
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      objectFit: 'fill',
      margin: '0',
      padding: '0',
      border: '0',
      pointerEvents: 'none',
      zIndex: '1',
      transformOrigin: 'top left',
      willChange: 'transform',
      borderRadius: '0',
    });
    image.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
    layer.append(image);
    return image;
  }

  private transformFrame(x: number, y: number, scale: number): Keyframe {
    return { transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})` };
  }
}
