# Assets da 3D Flash

Os 14 arquivos recebidos foram preservados e copiados byte a byte. Nenhuma imagem foi recortada, otimizada, recriada ou editada. Os mockups ficam exclusivamente em `docs/references/`; os demais arquivos ficam em `public/assets/`.

## Inventário

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

## Pendências e limites de fidelidade

- **Pessoa (`pessoa-original.png`): renderização bloqueada até receber o arquivo correto.** O arquivo 13 é RGB e contém o xadrez incorporado aos pixels. Não possui transparência real, inclusive ao redor dos rastros azuis e na abertura da câmera da capinha. Não aplicar remoção automática nem usar o mockup como substituto do asset original.
- **Chaveiro `e4kc-motorsport.png`: divergência de identidade.** O arquivo 4 fornecido mostra “e4KC Motorsport”, enquanto os mockups mostram “C4K Marketing”. Aguardar definição/arquivo correto para concluir a fidelidade desse elemento; não substituir silenciosamente.
- **Elementos não fornecidos separadamente:** fundo azul, divisórias onduladas, pedestais das capinhas e ícones sociais tridimensionais. Registrar a falta dos originais antes de finalizar os elementos visuais correspondentes. Não extrair os produtos ou a pessoa dos mockups.
- **Recortes:** logo, ícone de menu, plaquinha e alguns chaveiros apresentam pequenas franjas/artefatos de recorte. Avaliar sua aparência no fundo azul da implementação antes de propor qualquer alteração.
- **Margens e halos:** as imagens têm caixas transparentes e halos diferentes. A futura trajetória deve considerar os limites visíveis dos objetos, e não somente a caixa completa do PNG, para preservar escala e corredores de passagem.
- **Referência mobile:** `mockup-mobile.png` contém margens pretas laterais; elas pertencem ao arquivo de referência e não definem margens fixas do layout responsivo.

## Verificações executadas

- 14 arquivos de origem encontrados e copiados para os destinos descritos.
- SHA-256 de cada cópia comparado com a origem: 14 de 14 idênticos.
- Dimensões e modo de cor lidos com Pillow: arquivos 1–11 em RGBA; arquivos 12–14 em RGB.
- Os PNGs originais permanecem em `/workspace/assets/3d-flash/`.
- Nenhuma alteração em `src/`, `package.json` ou `README.md` foi realizada por esta organização de assets.

## Uso futuro

Os arquivos em `public/` serão servidos a partir de `/assets/`. A presença de um arquivo nessa pasta não autoriza renderizar um asset marcado como pendente. Em particular, a pessoa deve permanecer sem renderização até a resolução da transparência. As URLs comerciais e a fonte definitiva são configurações pendentes, separadas deste inventário de imagens.
