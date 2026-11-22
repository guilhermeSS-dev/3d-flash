import { KeychainAsset } from '../models/keychain-asset';

export const siteAssets = {
  logo: 'assets/images/logo.png',
  menu: 'assets/icons/menu-raios.png',
  qrStand: 'assets/images/plaquinha-qr.png',
  courses: {
    beginner: 'assets/images/iniciante.png',
    modeling: 'assets/images/modelagem.png',
  },
  productsBanner: 'assets/images/produtos_banner.png',
  phoneCase: {
    digital: 'assets/images/capinha-digital.png',
    physical: 'assets/images/capinha-fisica.png',
  },
  // Updated to the user-supplied Hero image.
  person: {
    src: 'assets/images/pessoa-hero-transparente.png',
    renderAllowed: true,
  },
  keychains: [
    {
      id: 'ro-modas',
      src: 'assets/keychains/ro-modas.png',
      width: 1536,
      height: 1024,
      bounds: { x: 503, y: 6, width: 527, height: 992 },
      renderAllowed: true,
    },
    {
      id: 'brasileira-acai',
      src: 'assets/keychains/brasileira-acai.png',
      width: 1199,
      height: 1312,
      bounds: { x: 238, y: 5, width: 736, height: 1274 },
      renderAllowed: true,
    },
    {
      id: 'leca-tintas',
      src: 'assets/keychains/leca-tintas.png',
      width: 1230,
      height: 1278,
      bounds: { x: 104, y: 16, width: 1024, height: 1262 },
      renderAllowed: true,
    },
    {
      id: 'e4kc-motorsport',
      src: 'assets/keychains/e4kc-motorsport.png',
      width: 1024,
      height: 1536,
      bounds: { x: 339, y: 27, width: 371, height: 1496 },
      renderAllowed: true,
    },
    {
      id: 'v-motos-racing',
      src: 'assets/keychains/v-motos-racing.png',
      width: 1024,
      height: 1536,
      bounds: { x: 208, y: 18, width: 591, height: 1495 },
      renderAllowed: true,
    },
  ] satisfies readonly KeychainAsset[],
} as const;
