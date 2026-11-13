import { ComponentFixture, TestBed } from '@angular/core/testing';
import { courseModules } from '../../data/course.data';
import { CourseAccordion } from './course-accordion';

describe('CourseAccordion', () => {
  let fixture: ComponentFixture<CourseAccordion>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [CourseAccordion] });
    fixture = TestBed.createComponent(CourseAccordion);
    fixture.componentRef.setInput('modules', courseModules);
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  });

  it('keeps every collapsed panel out of the accessibility and interaction trees', () => {
    const buttons = element.querySelectorAll<HTMLButtonElement>('button');
    expect(buttons.length).toBe(4);

    for (const button of buttons) {
      const controlledId = button.getAttribute('aria-controls');
      const panel = element.querySelector<HTMLElement>(`#${controlledId}`);
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(panel?.getAttribute('aria-labelledby')).toBe(button.id);
      expect(panel?.getAttribute('aria-hidden')).toBe('true');
      expect(panel?.hasAttribute('inert')).toBe(true);
    }
  });

  it('expands and collapses the same module and leaves others independent', async () => {
    const buttons = element.querySelectorAll<HTMLButtonElement>('button');
    const first = buttons[0];
    const second = buttons[1];
    const firstPanel = element.querySelector<HTMLElement>(
      `#${first.getAttribute('aria-controls')}`,
    );

    first.click();
    await fixture.whenStable();
    expect(first.getAttribute('aria-expanded')).toBe('true');
    expect(firstPanel?.getAttribute('aria-hidden')).toBe('false');
    expect(firstPanel?.hasAttribute('inert')).toBe(false);

    second.click();
    await fixture.whenStable();
    expect(first.getAttribute('aria-expanded')).toBe('true');
    expect(second.getAttribute('aria-expanded')).toBe('true');

    first.click();
    await fixture.whenStable();
    expect(first.getAttribute('aria-expanded')).toBe('false');
    expect(firstPanel?.hasAttribute('inert')).toBe(true);
    expect(second.getAttribute('aria-expanded')).toBe('true');
  });

  it('moves header focus with arrows and Home/End without toggling panels', () => {
    const buttons = element.querySelectorAll<HTMLButtonElement>('button');
    const press = (index: number, key: string): void => {
      buttons[index].dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
    };

    buttons[0].focus();
    press(0, 'ArrowUp');
    expect(document.activeElement).toBe(buttons[3]);
    press(3, 'ArrowDown');
    expect(document.activeElement).toBe(buttons[0]);
    press(0, 'End');
    expect(document.activeElement).toBe(buttons[3]);
    press(3, 'Home');
    expect(document.activeElement).toBe(buttons[0]);
    expect(
      Array.from(buttons).every((button) => button.getAttribute('aria-expanded') === 'false'),
    ).toBe(true);
  });
});
