export interface SiteLinks {
  readonly instagram: string;
  readonly whatsapp: string;
  readonly hotmart: string;
  readonly course: '/curso';
}

export interface CoursePresentation {
  readonly name: string;
  readonly duration: string;
  readonly introduction: string;
}

export interface SiteConfig {
  readonly brand: {
    readonly name: string;
    readonly description: string;
    readonly concept: string;
  };
  readonly links: SiteLinks;
  readonly course: CoursePresentation;
}
