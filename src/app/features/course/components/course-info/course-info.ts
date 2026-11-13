import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CoursePresentation } from '../../../../core/models/site-config';

@Component({
  selector: 'app-course-info',
  templateUrl: './course-info.html',
  styleUrl: './course-info.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseInfo {
  readonly presentation = input.required<CoursePresentation>();
}
