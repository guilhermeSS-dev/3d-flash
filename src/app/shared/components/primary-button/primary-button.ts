import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { siteConfig } from '../../../core/config/site.config';

@Component({
  selector: 'app-primary-button',
  imports: [RouterLink],
  templateUrl: './primary-button.html',
  styleUrl: './primary-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrimaryButton {
  readonly icon = input<'course' | 'external'>('course');
  protected readonly destination = siteConfig.links.course;
}
