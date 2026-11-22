import { ChangeDetectionStrategy, Component } from '@angular/core';
import { siteAssets } from '../../../../core/config/assets.config';
import { siteConfig } from '../../../../core/config/site.config';

@Component({
  selector: 'app-stl-section',
  templateUrl: './stl-section.html',
  // Share the existing banner layout, zoom and reduced-motion styles.
  styleUrl: '../products-section/products-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StlSection {
  protected readonly assets = siteAssets;
  protected readonly config = siteConfig;
}
