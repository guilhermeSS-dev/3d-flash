import { SiteConfig } from '../models/site-config';

/** Empty fields are intentional: do not invent commercial information or URLs. */
export const siteConfig = {
  brand: {
    name: '3D Flash',
    description: 'Impressão 3D',
    concept: 'Da imaginação à realidade',
  },
  links: { instagram: '', whatsapp: '', hotmart: '', course: '/curso' },
  course: { name: '', duration: '', introduction: '' },
} as const satisfies SiteConfig;
