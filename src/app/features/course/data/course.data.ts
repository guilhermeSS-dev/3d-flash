import { CoursePresentation } from '../../../core/models/site-config';
import { CourseModule } from '../models/course-module';
import beginnerCourse from './iniciante.json';
import modelingCourse from './modelagem.json';

export interface CourseContent {
  readonly presentation: CoursePresentation;
  readonly modules: readonly CourseModule[];
}

export const courseCatalog = {
  iniciante: beginnerCourse,
  modelagem: modelingCourse,
} satisfies Readonly<Record<string, CourseContent>>;
