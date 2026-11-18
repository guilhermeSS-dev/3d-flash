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
}
interface ViewTransitionDocument extends Document {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
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
  private originImage: HTMLImageElement | null = null;

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

  protected openCourse(courseId: CourseId, event: MouseEvent): void {
    const trigger = event.currentTarget;
    this.originImage = trigger instanceof HTMLElement ? trigger.querySelector('img') : null;
    if (this.originImage) this.originImage.style.viewTransitionName = 'course-banner';

    this.runTransition(() => {
      this.selectedCourseId.set(courseId);
      this.changeDetector.detectChanges();
      this.dialog()?.nativeElement.showModal();
      this.changeDetector.detectChanges();
    });
  }

  protected closeCourse(): void {
    const close = (): void => {
      this.dialog()?.nativeElement.close();
      this.selectedCourseId.set(null);
      this.changeDetector.detectChanges();
    };
    const transition = this.runTransition(close);
    if (transition) void transition.finished.finally(() => this.clearOriginTransitionName());
    else this.clearOriginTransitionName();
  }

  protected onDialogClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeCourse();
  }

  protected onDialogCancel(event: Event): void {
    event.preventDefault();
    this.closeCourse();
  }

  private runTransition(callback: () => void): { finished: Promise<void> } | null {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const transitionDocument = document as ViewTransitionDocument;
    if (reducedMotion || !transitionDocument.startViewTransition) {
      callback();
      return null;
    }
    return transitionDocument.startViewTransition(callback);
  }

  private clearOriginTransitionName(): void {
    if (this.originImage) {
      this.originImage.style.viewTransitionName = '';
      this.originImage = null;
    }
  }
}
