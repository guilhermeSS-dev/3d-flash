import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
@Component({
  selector: 'app-launch-countdown',
  templateUrl: './launch-countdown.html',
  styleUrl: './launch-countdown.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaunchCountdown {
  readonly synchronized = input(true);
  readonly units = input.required<readonly { readonly label: string; readonly value: number }[]>();
  protected readonly depths = Array.from({ length: 10 }, (_, i) => 10 - i);
  protected readonly groups = computed(() =>
    this.units().map((unit, index) => ({
      ...unit,
      index,
      digits: (this.synchronized() ? unit.value.toString().padStart(2, '0') : '--').split(''),
    })),
  );
}
