import { TestRequest } from '@angular/common/http/testing';
import { KeychainAsset } from '../models/keychain-asset';

export const siteAssets = {
  logo: 'assets/images/logo.png',
  menu: 'assets/icons/menu-raios.png',
  qrStand: 'assets/images/plaquinha-qr.png',
  phoneCase: {
    digital: 'assets/images/capinha-digital.png',
    physical: 'assets/images/capinha-fisica.png',
  },
  // Original contains a baked-in checkerboard. Do not render it as a cutout.
  person: {
    src: 'assets/images/pessoa-original.png',
    status: 'pending-transparency',
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
      id: 'ro-cabelos',
      src: 'assets/keychains/ro-cabelos.png',
      width: 1536,
      height: 1024,
      bounds: { x: 490, y: 12, width: 551, height: 994 },
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
      status: 'differs-from-mockup',
      width: 1024,
      height: 1536,
      bounds: { x: 339, y: 27, width: 371, height: 1496 },
      renderAllowed: false,
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
