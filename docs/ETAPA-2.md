# Etapa 2 — Landing estática

## Entrega implementada

A rota inicial contém exatamente cinco regiões semânticas: Hero, Sobre, Curso, Contato e Rodapé (quatro `section` e um `footer`). O shell e a rota do curso continuam funcionando. Não houve publicação.

Arquivos principais criados:

- `src/app/features/home/components/hero-section/*`
- `src/app/features/home/components/about-section/*`
- `src/app/features/home/components/course-preview-section/*`
- `src/app/features/home/components/contact-section/*`
- `src/app/features/home/components/footer-section/*`
- `src/app/features/home/components/floating-keychains/*`
- `src/app/shared/components/primary-button/*`
- `src/app/shared/components/section-divider/*`
- `src/app/core/models/keychain-asset.ts`
- `src/styles/_home.scss`

Arquivos existentes atualizados: home-page, assets.config.ts, styles.scss, _tokens.scss e testes de rotas. Página exclusiva do curso permanece na tela técnica da Etapa 1.

## Composição e decisões

Desktop: texto principal à esquerda e área da pessoa/chaveiros à direita; Sobre com texto e dupla de capinhas; Curso com corredor esquerdo, texto, plaquinha e CTA; Contato com texto e redes sociais; rodapé com marca e divisor.

Mobile: composição do Hero acima do título; Sobre alinhado à esquerda; Curso à direita; tipografia e espaços fluidos. As margens pretas laterais do PNG mobile não foram reproduzidas no layout.

Textos do mockup preservados. Os dois CTAs usam o mesmo componente e a rota configurada `/curso`. Botões sociais ficam nativamente desabilitados enquanto suas URLs estiverem vazias. Não há formulário.

Os chaveiros são imagens independentes em wrappers externos e internos separados. A posição estática usa limites visíveis medidos no alpha dos PNGs, compensando margens por CSS sem recortar ou alterar os arquivos. O sexto lugar está reservado ao asset divergente, sem renderizá-lo. Nenhuma flutuação ou trajetória foi iniciada nesta etapa.

Há reservas geométricas `data-person-slot`, `data-case-transformation` e `data-keychain-formation`. A formação de Contato ocupa espaço real abaixo dos botões, como pedido, mesmo que o mockup original não mostre a fileira.

O ícone original do menu aparece como referência estática, decorativa e sem eventos. Dropdown, foco e teclado do menu pertencem à Etapa 4; não há um falso botão operável.

## Pendências que impedem concluir a fidelidade visual

- **Pessoa:** não renderizada; arquivo sem transparência real, com xadrez incorporado. O espaço permanece reservado, sem pessoa gerada, silhueta inventada ou recorte retirado do mockup.
- **C4K Marketing:** arquivo recebido é e4KC Motorsport. A imagem divergente não é exibida.
- **Fonte:** sistema provisório; família aprovada ainda desconhecida.
- **Fundo, divisórias e pedestais:** aproximações provisórias em CSS/SVG; os originais não foram fornecidos.
- **Ícones sociais:** representações vetoriais provisórias; faltam os assets tridimensionais.
- **Cores dos CTAs:** bordas iluminadas mantidas, com faixa central mais escura para legibilidade do texto branco. Token provisório documentado, sujeito à comparação visual.
- PNGs íntegros ainda não têm versões responsivas comprimidas; essa otimização permanece para a etapa de desempenho.

As áreas pendentes não estão declaradas finalizadas. O registro de cada original continua em `ASSETS.md`; nenhum arquivo de imagem foi editado.

## Verificações executadas

- Build de produção aprovado, sem warnings de budget.
- Seis testes de integração em Vitest/JSDOM aprovados: rotas/títulos, retorno, fallback, salto ao conteúdo, ambos os CTAs e proteção dos destinos/imagens pendentes.
- Formatação verificada com Prettier.
- Revisão estática da semântica, configuração de links, dimensões das imagens e regras de Grid/Flex.
- Cálculo de contraste: branco sobre a faixa central `#b43c00` dos CTAs supera 4,5:1.

## Não verificado em navegador

Não houve screenshot, teste real de viewport, medição de overflow, comparação visual nem verificação de sobreposições renderizadas. Regras fluidas e breakpoints estão implementados, mas não equivalem a esses testes.

O ambiente está no perfil gerenciado de Sites e não disponibilizou `cua_repl.js`. A skill [Sites](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) determina: “If `cua_repl.js` is unavailable, skip browser QA: do not start a preview server, install a browser, or improvise another browser-control path.” Por isso, não foi iniciado um servidor/browser alternativo para simular essa validação.

## Próximo passo

Aguardar os assets necessários para concluir a comparação visual da Etapa 2. A Etapa 3 (página do curso) é independente desses assets, mas continua aguardando autorização do usuário, como definido no fluxo.
