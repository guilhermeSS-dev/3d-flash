import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: '3D Flash — Impressão 3D',
    loadComponent: () =>
      import('./features/home/pages/home-page/home-page').then((page) => page.HomePage),
  },
  {
    path: 'curso/:courseId',
    title: 'Curso | 3D Flash',
    loadComponent: () =>
      import('./features/course/pages/course-page/course-page').then((page) => page.CoursePage),
  },
  { path: 'curso', pathMatch: 'full', redirectTo: 'curso/iniciante' },
  { path: '**', redirectTo: '' },
];
