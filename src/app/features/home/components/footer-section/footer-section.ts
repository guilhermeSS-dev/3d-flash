import { ChangeDetectionStrategy, Component } from '@angular/core';
import { siteAssets } from '../../../../core/config/assets.config';

@Component({
  selector: 'app-footer-section',
  templateUrl: './footer-section.html',
  styleUrl: './footer-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterSection {
  protected readonly assets = siteAssets;
}
