import { ChangeDetectionStrategy, Component } from '@angular/core';
import { siteAssets } from '../../../../core/config/assets.config';

@Component({
  selector: 'app-about-section',
  templateUrl: './about-section.html',
  styleUrl: './about-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutSection {
  protected readonly assets = siteAssets;
}
