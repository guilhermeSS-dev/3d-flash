import { TestBed } from '@angular/core/testing';
import { EnrollmentButton } from './enrollment-button';

describe('EnrollmentButton', () => {
  async function render(destination: string) {
    TestBed.configureTestingModule({ imports: [EnrollmentButton] });
    const fixture = TestBed.createComponent(EnrollmentButton);
    fixture.componentRef.setInput('destination', destination);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('keeps enrollment unavailable without a configured destination', async () => {
    const element = await render('');
    expect(element.querySelector('a')).toBeNull();
    expect(element.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
  });

  it('uses the configured secure external destination without mentioning the provider', async () => {
    const destination = 'https://example.test/inscricao';
    const element = await render(destination);
    const link = element.querySelector<HTMLAnchorElement>('a');
    expect(link?.getAttribute('href')).toBe(destination);
    expect(link?.target).toBe('_blank');
    expect(link?.rel.split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    expect(link?.textContent).toContain('Quero me inscrever no curso');
    expect(element.textContent?.toLowerCase()).not.toContain('hotmart');
    expect(element.querySelector('button')).toBeNull();
  });

  it.each([
    '   ',
    '/curso',
    'javascript:alert(1)',
    'http://example.test/inscricao',
    'https://user:secret@example.test/',
  ])('does not navigate when the destination is invalid: %s', async (destination) => {
    const element = await render(destination);
    expect(element.querySelector('a')).toBeNull();
    expect(element.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
  });
});
