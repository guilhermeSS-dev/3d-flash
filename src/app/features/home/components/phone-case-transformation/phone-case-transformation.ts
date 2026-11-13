import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  NgZone,
} from '@angular/core';
import { siteAssets } from '../../../../core/config/assets.config';
import { AnimationSessionService } from '../../../../core/services/animation-session.service';
import { setupPhoneCaseTransformation } from '../../animations/phone-case-transformation.animations';

@Component({
  selector: 'app-phone-case-transformation',
  templateUrl: './phone-case-transformation.html',
  styleUrl: './phone-case-transformation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhoneCaseTransformation {
  readonly triggerElement = input.required<HTMLElement>();
  protected readonly assets = siteAssets;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly session = inject(AnimationSessionService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private cleanup: () => void = () => {};

  constructor() {
    afterNextRender(() => {
      this.zone.runOutsideAngular(() => {
        this.cleanup = setupPhoneCaseTransformation(
          this.element.nativeElement,
          this.triggerElement(),
          this.session,
        );
      });
    });
    this.destroyRef.onDestroy(() => this.cleanup());
  }
}
