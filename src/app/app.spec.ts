import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('Accessible application shell', () => {
  it('focuses the current page content without leaving /curso', async () => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/curso');
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLAnchorElement>('.skip-link')?.click();
    await fixture.whenStable();

    expect(document.activeElement).toBe(element.querySelector('main'));
    expect(router.url).toBe('/curso');
  });
});
