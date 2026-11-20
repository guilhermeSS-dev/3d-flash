import { VipReward } from './vip-reward';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type RunnerMode =
  'loading' | 'ready' | 'playing' | 'over' | 'error' | 'launching' | 'reward';
@Component({
  selector: 'app-runner-stage',
  imports: [VipReward],
  templateUrl: './runner-stage.html',
  styleUrl: './runner-stage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunnerStage {
  readonly clockReady = input(true);
  readonly mode = input.required<RunnerMode>();
  readonly score = input.required<number>();
  readonly best = input.required<number>();
  readonly muted = input.required<boolean>();
  readonly touch = input.required<boolean>();
  readonly rewardOpen = input.required<boolean>();
  readonly threshold = input.required<number>();
  readonly rewardClosed = output<void>();
  readonly vipUrl = input.required<string>();
  readonly mute = output<void>();
}
