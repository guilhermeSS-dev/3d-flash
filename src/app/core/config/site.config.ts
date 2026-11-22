import { SiteConfig } from '../models/site-config';

/** Empty fields are intentional: do not invent commercial information or URLs. */
export const siteConfig = {
  brand: {
    name: '3D Flash',
    description: 'Impressão 3D',
    concept: 'Da imaginação à realidade',
  },
  links: {
    instagram: '',
    whatsapp: '',
    hotmart: '',
    stlLibrary: 'https://makerworld.com/en/@gustavonatan?appSharePlatform=copy',
    productCatalog: 'https://collshp.com/3dflash.oficial?view=storefront',
    course: '/curso',
  },
  course: { name: '', duration: '', introduction: '' },
} as const satisfies SiteConfig;
