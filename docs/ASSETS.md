# Assets da 3D Flash

Os 14 arquivos recebidos originalmente foram preservados e copiados byte a byte. Os quatro assets adicionais enviados para a implementação da landing estão inventariados separadamente em [assets-manifest.json](assets-manifest.json), com SHA-256 calculado sobre os arquivos versionados. Nenhuma imagem foi recortada, otimizada ou editada. Os mockups ficam exclusivamente em `docs/references/`; os arquivos de produção ficam em `public/assets/`.

## Inventário original

O caminho de origem completo, dimensões, modo de cor, tamanho e SHA-256 de origem e destino estão registrados em [assets-manifest.json](assets-manifest.json). A origem comum é `/workspace/assets/3d-flash/`.

| Prefixo | Arquivo de origem                             | Destino no projeto                            | Dimensões   | Modo |
| ------- | --------------------------------------------- | --------------------------------------------- | ----------- | ---- |
| 1       | `1-E6331FF7-17E9-4FC7-9D44-6FC824B0FB09.PNG`  | `public/assets/keychains/ro-cabelos.png`      | 1536 × 1024 | RGBA |
| 2       | `2-D99CDD81-648F-4E17-BA23-6D1D4AC06201.PNG`  | `public/assets/images/plaquinha-qr.png`       | 1199 × 1312 | RGBA |
| 3       | `3-9264D1D7-AA0D-437E-B353-FB0967B9C5AB.PNG`  | `public/assets/images/capinha-fisica.png`     | 1024 × 1536 | RGBA |
| 4       | `4-1E403812-FAB4-400F-A070-14AB4A414D13.PNG`  | `public/assets/keychains/e4kc-motorsport.png` | 1024 × 1536 | RGBA |
| 5       | `5-D5C8D114-EB31-40D0-9761-CD6EBE2329C4.PNG`  | `public/assets/images/capinha-digital.png`    | 1024 × 1536 | RGBA |
| 6       | `6-1C4DC189-625E-4ED1-9EED-2AC890F7BC75.PNG`  | `public/assets/icons/menu-raios.png`          | 1312 × 1199 | RGBA |
| 7       | `7-33C5BC73-AE3C-489E-B723-09A3FB924457.PNG`  | `public/assets/images/logo.png`               | 2169 × 725  | RGBA |
| 8       | `8-6A3CAC70-34D0-4E26-AE2F-55D24C164524.PNG`  | `public/assets/keychains/ro-modas.png`        | 1536 × 1024 | RGBA |
| 9       | `9-FF917F30-C660-4822-B234-9CFC2A3286C2.PNG`  | `public/assets/keychains/v-motos-racing.png`  | 1024 × 1536 | RGBA |
| 10      | `10-7707EFB5-EB0B-4EE6-A32A-5A24BCF2446D.PNG` | `public/assets/keychains/brasileira-acai.png` | 1199 × 1312 | RGBA |
| 11      | `11-7756BADE-8D8D-4D76-8015-B62B8B761C2B.PNG` | `public/assets/keychains/leca-tintas.png`     | 1230 × 1278 | RGBA |
| 12      | `12-019E00D2-18D3-44BD-B8C6-EB2FFD38E6D1.PNG` | `docs/references/mockup-mobile.png`           | 1024 × 1535 | RGB  |
| 13      | `13-A8E30AE0-D4B1-4528-B808-D517EB872A0B.PNG` | `public/assets/images/pessoa-original.png`    | 1254 × 1254 | RGB  |
| 14      | `14-FD354FB4-B347-4A09-9216-6F48508CBFE1.PNG` | `docs/references/mockup-desktop.png`          | 1024 × 1536 | RGB  |

## Assets adicionais enviados para a landing

| Arquivo                | Uso                       |   Bytes | SHA-256                                                            |
| ---------------------- | ------------------------- | ------: | ------------------------------------------------------------------ |
| `iniciante.jpeg`       | Card Iniciante            | 244.180 | `2ba78082292a1ed12712f7183ea98e8bba20a97eea74ca780e1acc364b53369d` |
| `modelagem.jpeg`       | Card Modelagem            | 286.188 | `d350cab3fd24c2be6e57d6e03bf6ccc173055d5d45e7517c13bed2bf36a6895e` |
| `produtos_banner.jpeg` | Banner de produtos Shopee | 290.196 | `f9e0d251ae9d3b1738619a6c0dc219f37951842fd16ca9b2f04403af7b14e8d3` |
| `pessoa.jpeg`          | Nova imagem do Hero       | 223.056 | `a6badde47c582653b5f90d8fe944c2d8e61f7ea165ed6eb47ed9d03d20eadf97` |

## Pendências e limites de fidelidade

- **Pessoa original:** `pessoa-original.png` contém o xadrez incorporado aos pixels e permanece fora do Hero. A imagem enviada posteriormente, `pessoa.jpeg`, é a imagem efetivamente usada no Hero.
- **Chaveiro e4KC Motorsport:** o arquivo fornecido mostra “e4KC Motorsport”, enquanto a referência mostra “C4K Marketing”. A imagem divergente continua sem renderização.
- **Elementos não fornecidos separadamente:** fundo azul, divisórias onduladas, pedestais das capinhas e ícones sociais tridimensionais. Os elementos visuais atuais são aproximações da composição original.
- **Recortes:** os PNGs originais permanecem inalterados. As franjas/artefatos de recorte devem ser avaliados no fundo azul da implementação.
- **Margens e halos:** as imagens têm caixas transparentes e halos diferentes. A trajetória considera os limites visíveis dos objetos, e não somente a caixa completa do PNG.
- **Referência mobile:** `mockup-mobile.png` contém margens pretas laterais; elas pertencem ao arquivo de referência e não definem margens fixas do layout responsivo.

## Verificações

Os 14 assets originais e seus estados de integridade permanecem descritos no manifesto. Os quatro assets adicionais têm hashes próprios no mesmo manifesto e são conferidos pelo verificador de build. Os arquivos originais não foram alterados.

## Uso futuro

Os arquivos em `public/` são servidos a partir de `/assets/`. A presença de um arquivo nessa pasta não autoriza renderizar um asset marcado como pendente. Em particular, o chaveiro e4KC permanece bloqueado até receber o correspondente da referência.
