import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
@Component({
  selector: 'app-vip-reward',
  templateUrl: './vip-reward.html',
  styleUrl: './vip-reward.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VipReward {
  readonly url = input.required<string>();
  readonly threshold = input.required<number>();
  readonly closed = output<void>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  constructor() {
    afterNextRender(() =>
      this.host.nativeElement
        .querySelector<HTMLElement>('.reward-card')
        ?.focus({ preventScroll: true }),
    );
  }
  protected key(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closed.emit();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [
      ...this.host.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]'),
    ];
    const index = controls.indexOf(document.activeElement as HTMLElement);
    event.preventDefault();
    const next =
      index < 0
        ? event.shiftKey
          ? controls.length - 1
          : 0
        : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    controls[next]?.focus();
  }
}
