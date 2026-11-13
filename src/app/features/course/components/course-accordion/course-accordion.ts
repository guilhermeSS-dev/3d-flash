import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { CourseModule } from '../../models/course-module';

@Component({
  selector: 'app-course-accordion',
  templateUrl: './course-accordion.html',
  styleUrl: './course-accordion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseAccordion {
  readonly modules = input.required<readonly CourseModule[]>();

  private readonly expandedIds = signal<ReadonlySet<string>>(new Set());
  private readonly triggers = viewChildren<ElementRef<HTMLButtonElement>>('moduleTrigger');

  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected toggle(id: string): void {
    this.expandedIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected navigateHeaders(event: KeyboardEvent, currentIndex: number): void {
    const buttons = this.triggers();
    if (!buttons.length) return;

    let nextIndex: number;
    switch (event.key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % buttons.length;
        break;
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = buttons.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    buttons[nextIndex]?.nativeElement.focus();
  }
}
