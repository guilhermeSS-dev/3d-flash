# Publicação e manutenção

## Estado da entrega

A branch develop contém atualizações posteriores ao pacote estático registrado em docs/release-manifest.json. Portanto, o inventário de release atual é histórico e precisa ser regenerado após a próxima compilação aprovada. Não houve deploy, registro de hospedagem ou configuração de domínio.

## Verificação antes de gerar uma versão

```bash
npm ci
npm run release:check
```

O segundo comando verifica formatação, executa os testes, compila em produção e confere as referências estáticas. O build termina em dist/. npm run verify:build pode ser usado isoladamente depois de um build existente.

O verificador examina a entrada HTML, JS/CSS, imports dos chunks, presença e integridade dos assets de produção registrados em docs/assets-manifest.json e arquivo de licenças. Rejeita referências ausentes, assets alterados, source maps ou pastas de desenvolvimento no resultado. Não é um teste de navegador, hospedagem, tráfego de rede ou URLs comerciais.

Para registrar o inventário depois de um build aprovado:

```bash
node scripts/verify-build.mjs > docs/release-manifest.json
```

Um novo build pode alterar hashes e nomes dos bundles; republique o conjunto completo, preservando uma cópia da versão anterior para eventual retorno.

## CI da branch develop

O workflow .github/workflows/ci.yml executa instalação reproduzível, formatação, testes, build com base /3d-flash/ e auditoria dos artefatos em pushes e pull requests direcionados à develop. Ele não publica no GitHub Pages; a publicação continua restrita ao workflow da branch master.

## Contrato da hospedagem

No GitHub Pages deste repositório, a aplicação é servida em /3d-flash/. O build usa base href /3d-flash/ e as imagens usam caminhos relativos (assets/...) para permanecerem dentro desse subdiretório.

1. O workflow publica o conteúdo de dist/ no Pages, incluindo assets/ e 3rdpartylicenses.txt.
2. Servir JS como JavaScript, CSS como CSS e imagens como imagem. Usar HTTPS no destino definitivo.
3. A navegação usa hash routing, evitando exigir fallback de SPA no servidor estático.
4. Recursos estáticos inexistentes precisam retornar 404; não devolver HTML como resposta de um bundle JS/CSS ausente.
5. Revalidar index.html a cada publicação. Bundles com hash podem ter cache prolongado; imagens com nomes estáveis não devem receber cache imutável sem versionamento.
6. Abrir a landing, as duas rotas de curso e uma rota inexistente após publicar. Conferir console, rede, links e scroll nos dois sentidos no servidor real.

## Configurações que ainda precisam de valores

| Informação                                       | Arquivo                                                      |
| ------------------------------------------------ | ------------------------------------------------------------ |
| Instagram, WhatsApp, inscrição e catálogo Shopee | src/app/core/config/site.config.ts                           |
| Nome, duração e introdução dos cursos            | src/app/features/course/data/iniciante.json e modelagem.json |
| Módulos e descrições definitivos                 | Os mesmos JSONs dos cursos                                   |
| Assets liberados ou bloqueados                   | src/app/core/config/assets.config.ts                         |
| Fonte e tokens visuais                           | src/styles/_tokens.scss                                      |
| Intensidade e duração das animações              | src/app/core/config/animation.config.ts                      |

Manter URLs vazias enquanto não existirem destinos reais. Os dois CTAs da landing navegam para /curso, que redireciona para o curso Iniciante; os cards abrem o curso correspondente. As duas inscrições usam a mesma configuração. A inscrição exige HTTPS. Não colocar segredos no frontend.

## Pendências antes da aprovação definitiva

- Chaveiro C4K Marketing correspondente à referência; fonte, fundo, divisórias, pedestais e ícones sociais originais ou definição aprovada.
- URLs reais, apresentação comercial e conteúdo definitivo dos cursos.
- Comparação visual desktop/mobile; inspeção em tablets, zoom, teclado, movimento reduzido e tecnologias assistivas.
- Validação das animações, desempenho em dispositivos reais e hospedagem final.

A preparação técnica não substitui a aprovação visual/comercial nem a validação no servidor de produção.
