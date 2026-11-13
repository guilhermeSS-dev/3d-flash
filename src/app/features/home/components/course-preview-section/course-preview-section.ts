import { ChangeDetectionStrategy, Component } from '@angular/core';
import { siteAssets } from '../../../../core/config/assets.config';
import { PrimaryButton } from '../../../../shared/components/primary-button/primary-button';
import { PhoneCaseTransformation } from '../phone-case-transformation/phone-case-transformation';

@Component({
  selector: 'app-course-preview-section',
  imports: [PrimaryButton, PhoneCaseTransformation],
  templateUrl: './course-preview-section.html',
  styleUrl: './course-preview-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursePreviewSection {
  protected readonly assets = siteAssets;
}
