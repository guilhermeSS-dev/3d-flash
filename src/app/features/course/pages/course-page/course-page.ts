import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { siteAssets } from '../../../../core/config/assets.config';
import { siteConfig } from '../../../../core/config/site.config';
import { CourseInfo } from '../../components/course-info/course-info';
import { CourseAccordion } from '../../components/course-accordion/course-accordion';
import { EnrollmentButton } from '../../components/enrollment-button/enrollment-button';
import { courseCatalog } from '../../data/course.data';

@Component({
  selector: 'app-course-page',
  imports: [RouterLink, CourseInfo, CourseAccordion, EnrollmentButton],
  templateUrl: './course-page.html',
  styleUrl: './course-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursePage {
  private readonly route = inject(ActivatedRoute);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  private readonly selectedCourse = computed(() => {
    const courseId = this.routeParams().get('courseId') ?? 'iniciante';
    return courseCatalog[courseId as keyof typeof courseCatalog] ?? courseCatalog.iniciante;
  });

  protected readonly assets = siteAssets;
  protected readonly config = siteConfig;
  protected readonly presentation = computed(() => this.selectedCourse().presentation);
  protected readonly modules = computed(() => this.selectedCourse().modules);
}
