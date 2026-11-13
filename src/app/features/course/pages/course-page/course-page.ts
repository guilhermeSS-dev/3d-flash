import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { siteAssets } from '../../../../core/config/assets.config';
import { siteConfig } from '../../../../core/config/site.config';
import { CourseInfo } from '../../components/course-info/course-info';
import { CourseAccordion } from '../../components/course-accordion/course-accordion';
import { EnrollmentButton } from '../../components/enrollment-button/enrollment-button';
import { courseModules } from '../../data/course.data';

@Component({
  selector: 'app-course-page',
  imports: [RouterLink, CourseInfo, CourseAccordion, EnrollmentButton],
  templateUrl: './course-page.html',
  styleUrl: './course-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursePage {
  protected readonly assets = siteAssets;
  protected readonly config = siteConfig;
  protected readonly modules = courseModules;
}
