import { TestBed } from '@angular/core/testing';
import { VipReward } from './vip-reward';

describe('Readable VIP dialog', () => {
  it('uses the smooth WhatsApp icon and keeps every control directly in the card', () => {
    const fixture = TestBed.createComponent(VipReward);
    fixture.componentRef.setInput('url', '');
    fixture.componentRef.setInput('threshold', 7);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const icon = root.querySelector('svg')!;
    expect(icon.getAttribute('viewBox')).toBe('0 0 64 64');
    expect(icon.querySelector('path')!.getAttribute('d')).toContain('a26 26');
    expect(root.querySelector('.reward-header .reward-close')).not.toBeNull();
    expect(root.querySelector('.reward-card')!.textContent).toContain('Você coletou 7 raios!');
    expect(root.querySelector<HTMLButtonElement>('.reward-link')!.disabled).toBe(false);
    expect(root.querySelector('.reward-pending')).toBeNull();
    fixture.destroy();
  });
});
