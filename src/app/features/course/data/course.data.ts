import { CourseModule } from '../models/course-module';

/** Provisional curriculum. Replace the titles and Lorem Ipsum before publication. */
export const courseModules = [
  {
    id: 'module-01',
    title: 'Módulo 01 — Introdução às ferramentas',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo vel neque facilisis tincidunt.',
  },
  {
    id: 'module-02',
    title: 'Módulo 02 — Modelagem 3D',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed dignissim, massa a feugiat aliquet, neque libero consequat urna.',
  },
  {
    id: 'module-03',
    title: 'Módulo 03 — Preparação para impressão',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque habitant morbi tristique senectus et netus et malesuada.',
  },
  {
    id: 'module-04',
    title: 'Módulo 04 — Impressão e acabamento',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean placerat, justo non fermentum volutpat, sapien augue luctus neque.',
  },
] as const satisfies readonly CourseModule[];
