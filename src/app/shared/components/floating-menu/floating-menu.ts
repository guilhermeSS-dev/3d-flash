import { ViewportScroller } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { animationConfig } from '../../../core/config/animation.config';
import { siteAssets } from '../../../core/config/assets.config';
import { navigationItems } from '../../../core/config/navigation.config';

@Component({
  selector: 'app-floating-menu',
  imports: [RouterLink],
  templateUrl: './floating-menu.html',
  styleUrl: './floating-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:pointerdown)': 'onDocumentPointer($event)',
    '(document:keydown)': 'onDocumentKeydown($event)',
    '(focusout)': 'onFocusOut($event)',
    '[style.--menu-duration]': 'durationMs + "ms"',
  },
})
export class FloatingMenu {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly scroller = inject(ViewportScroller);
  private readonly destroyRef = inject(DestroyRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('navigationTrigger');

  protected readonly assets = siteAssets;
  protected readonly items = navigationItems;
  protected readonly expanded = signal(false);
  protected readonly durationMs = animationConfig.duration.menu * 1000;

  constructor() {
    // Read geometry only when navigating to an anchor, never on each scroll frame.
    this.scroller.setOffset(() => [
      0,
      Math.ceil((this.trigger()?.nativeElement.getBoundingClientRect().bottom ?? 0) + 16),
    ]);
    this.destroyRef.onDestroy(() => this.scroller.setOffset([0, 0]));
  }

  protected toggle(): void {
    if (this.expanded()) {
      this.close(true);
    } else {
      this.expanded.set(true);
    }
  }

  protected close(restoreFocus = false): void {
    this.expanded.set(false);
    if (restoreFocus) this.trigger()?.nativeElement.focus({ preventScroll: true });
  }

  protected onDocumentPointer(event: Event): void {
    if (this.expanded() && !event.composedPath().includes(this.element.nativeElement)) {
      this.close();
    }
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.expanded()) {
      event.preventDefault();
      this.close(true);
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    if (
      this.expanded() &&
      (!event.relatedTarget || !this.element.nativeElement.contains(event.relatedTarget as Node))
    ) {
      this.close();
    }
  }
}
