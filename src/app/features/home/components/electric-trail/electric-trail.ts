import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-electric-trail',
  templateUrl: './electric-trail.html',
  styleUrl: './electric-trail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class ElectricTrail {}
