import { TestBed } from '@angular/core/testing';
import { LaunchCountdown } from './launch-countdown';
describe('Independent block countdown digits', () => {
  it('has no cards, preserves each wrapper on updates and floats digits with distinct phases', () => {
    const fixture = TestBed.createComponent(LaunchCountdown);
    const units = [
      { label: 'Dias', value: 12 },
      { label: 'Horas', value: 3 },
      { label: 'Minutos', value: 45 },
      { label: 'Segundos', value: 59 },
    ];
    fixture.componentRef.setInput('units', units);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const digits = [...root.querySelectorAll<HTMLElement>('.digit')];
    expect(digits).toHaveLength(8);
    expect(root.querySelector('.timer-front')).toBeNull();
    expect(root.querySelectorAll('.unit-separator[aria-hidden="true"]')).toHaveLength(3);
    expect(new Set(digits.map((d) => d.style.getPropertyValue('--float-delay'))).size).toBe(8);
    expect(root.querySelectorAll('.digit-face')).toHaveLength(8);
    expect(root.querySelectorAll('.digit-depth')).toHaveLength(80);
    fixture.componentRef.setInput(
      'units',
      units.map((u) => (u.label === 'Segundos' ? { ...u, value: 58 } : u)),
    );
    fixture.detectChanges();
    expect([...root.querySelectorAll('.digit')]).toEqual(digits);
    expect(root.querySelectorAll('.digit-face')[7].textContent).toBe('8');
    fixture.destroy();
  });
});
