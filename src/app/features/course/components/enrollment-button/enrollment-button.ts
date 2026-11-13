import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-enrollment-button',
  templateUrl: './enrollment-button.html',
  styleUrl: './enrollment-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentButton {
  readonly destination = input.required<string>();

  protected readonly externalUrl = computed(() => {
    const value = this.destination().trim();
    if (!value) return '';

    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch {
      return '';
    }
  });
}
