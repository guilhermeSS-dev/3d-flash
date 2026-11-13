import { ChangeDetectionStrategy, Component } from '@angular/core';
import { siteAssets } from '../../../../core/config/assets.config';
import { PrimaryButton } from '../../../../shared/components/primary-button/primary-button';
import { FloatingKeychains } from '../floating-keychains/floating-keychains';

@Component({
  selector: 'app-hero-section',
  imports: [PrimaryButton, FloatingKeychains],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSection {
  protected readonly assets = siteAssets;
}
