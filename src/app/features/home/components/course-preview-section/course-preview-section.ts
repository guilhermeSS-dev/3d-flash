import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { siteAssets } from '../../../../core/config/assets.config';

@Component({
  selector: 'app-course-preview-section',
  imports: [RouterLink],
  templateUrl: './course-preview-section.html',
  styleUrl: './course-preview-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursePreviewSection {
  protected readonly assets = siteAssets;
}
