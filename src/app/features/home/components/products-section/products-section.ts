import { ChangeDetectionStrategy, Component } from '@angular/core';
import { siteAssets } from '../../../../core/config/assets.config';
import { siteConfig } from '../../../../core/config/site.config';

@Component({
  selector: 'app-products-section',
  templateUrl: './products-section.html',
  styleUrl: './products-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsSection {
  protected readonly assets = siteAssets;
  protected readonly config = siteConfig;
}
