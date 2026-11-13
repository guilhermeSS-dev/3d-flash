import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-section-divider',
  templateUrl: './section-divider.html',
  styleUrl: './section-divider.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class SectionDivider {
  readonly warm = input(false);
}
