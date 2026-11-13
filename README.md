# 3D Flash — Impressão 3D

Aplicação Angular standalone com TypeScript, SCSS e Router. GSAP e ScrollTrigger estão disponíveis para as etapas de animação. O desenvolvimento segue entregas incrementais; a base Angular, as duas páginas, o menu, as animações secundárias e a flutuação dos chaveiros estão implementados. A geometria responsiva do percurso e a sincronização do grupo com scroll também estão implementadas. A conclusão visual depende dos assets pendentes e da comparação em navegador.

A rota inicial contém as cinco regiões da landing, textos e assets disponíveis. A pessoa e o chaveiro divergente permanecem sem renderização; fontes e elementos decorativos estão provisórios. A landing tem menu fixo com cinco âncoras, controle de foco e movimento reduzido. A página do curso contém apresentação configurável, quatro acordeões e duas inscrições com destino compartilhado, sem menu. A landing tem abertura e entradas discretas e transformação da capinha em dois segundos, com estado preservado entre rotas. Cinco chaveiros disponíveis flutuam no Hero e acompanham o percurso com scrub reversível, pequenos atrasos e flutuação independente. O percurso em zigue-zague é calculado pelas seções e pelos obstáculos, com recálculo responsivo e cache de progresso. Na chegada ao Contato, os integrantes se alinham em uma fileira abaixo dos botões sociais; subir desfaz a formação. Descargas elétricas amarelas e angulares acompanham o deslocamento, com pool SVG limitado, proteção dos conteúdos e desaparecimento curto após parar. Não houve publicação. Detalhes e limites de validação em [docs/ETAPA-2.md](docs/ETAPA-2.md), [docs/ETAPA-3.md](docs/ETAPA-3.md), [docs/ETAPA-4.md](docs/ETAPA-4.md), [docs/ETAPA-5.md](docs/ETAPA-5.md), [docs/ETAPA-6-1.md](docs/ETAPA-6-1.md), [docs/ETAPA-6-2.md](docs/ETAPA-6-2.md), [docs/ETAPA-6-3.md](docs/ETAPA-6-3.md), [docs/ETAPA-6-4.md](docs/ETAPA-6-4.md), [docs/ETAPA-6-5.md](docs/ETAPA-6-5.md), [docs/ETAPA-6-6.md](docs/ETAPA-6-6.md), [docs/ETAPA-6-7.md](docs/ETAPA-6-7.md), [docs/ETAPA-7.md](docs/ETAPA-7.md) e [docs/ETAPA-8.md](docs/ETAPA-8.md).

## Executar

Requisitos: Node.js `^22.22.3 || ^24.15.0 || >=26.0.0` e npm 11 ou superior. Ambiente validado: Node 24.22.1 e npm 11.9.0.

```bash
npm ci
npm start
```

Abra o endereço informado pelo Angular CLI. Rotas: `/` e `/curso`. O script `npm run dev` expõe o servidor de desenvolvimento em `0.0.0.0` para previews gerenciados.

No sandbox desta sessão, utilize `npm --cache /workspace/.cache/npm ci` se o cache padrão do npm não for gravável. Esse caminho não é uma configuração obrigatória do projeto.

## Verificar

```bash
npm run build
npm run test:ci
npm run format:check
```

O build estático é gerado em `dist/`. A hospedagem futura deve devolver `index.html` para URLs da aplicação, incluindo o acesso direto a `/curso`. O teste de roteamento em JSDOM não substitui essa verificação no host final.

## Estrutura

- `src/app/core/config/`: marca, URLs, dados comerciais vazios, catálogo de imagens e parâmetros de animação.
- `src/app/core/models/`: interfaces das configurações.
- `src/app/features/home/pages/home-page/`: página inicial standalone, carregada por rota.
- `src/app/features/course/pages/course-page/`: página do curso standalone, carregada por rota.
- `src/app/app.routes.ts`: duas rotas, títulos e fallback para a página inicial.
- `src/styles/`: tokens e estilos globais.
- `public/assets/`: cópias integrais dos assets, com nomes descritivos.
- `docs/references/`: mockups para comparação; não são publicados no build.
- `docs/ASSETS.md` e `docs/assets-manifest.json`: inventário, pendências e hashes.
- `docs/ETAPAS.md`: progresso, verificações e próximos passos.

Componentes de seção da landing ficam em src/app/features/home/components/. O botão de curso e a divisória decorativa são compartilhados em src/app/shared/components/. As animações da landing ficam em src/app/features/home/animations/.

## Configurações

Edite `src/app/core/config/site.config.ts` para definir Instagram, WhatsApp, inscrição e dados do curso. Os campos comerciais começam vazios intencionalmente. Os dois botões de inscrição usam a mesma chave `links.hotmart` e permanecem indisponíveis enquanto ela estiver vazia ou inválida; nunca criar um destino fictício.

Os rótulos do menu ficam em `src/app/core/config/navigation.config.ts`. Preserve os IDs correspondentes às seções ao editar.

Os títulos e descrições provisórios dos módulos ficam em `src/app/features/course/data/course.data.ts`. Preserve IDs únicos ao editar. O componente de inscrição aceita uma URL HTTPS absoluta, normaliza o destino e abre em nova aba com proteção de navegação.

O percurso é calculado em `keychain-route.geometry.ts` e medido em `keychain-route-layout.ts`, que observa as dimensões de todos os integrantes renderizados. Os parâmetros de envelope individual e espaçamento em `animation.config.ts` ainda dependem do ajuste visual em navegador. A API de progresso usa o cache geométrico, sem medir DOM a cada frame. O driver `keychain-scroll.animations.ts` controla os wrappers externos do grupo pela mesma polilinha; cada seguidor tem origem, escala e atraso em distância próprios. O progresso é preservado no refresh, os estilos de integrantes descartados são restaurados e o scrubTween anterior é eliminado ao reconstruir o trigger.

A fileira final é calculada por `keychain-formation.geometry.ts` a partir da área reservada abaixo dos sociais. Os atrasos diminuem suavemente no Contato, e cada integrante abre para seu lugar somente depois de alcançar a faixa horizontal de chegada. `formationGapRatio` controla o espaço entre peças e `formationScrollShare` reserva tempo de scroll para essa fase. O campo `position` do snapshot representa o ponto nominal da rota central; os lugares individuais são resolvidos pelo driver.

O rastro usa `electric-bolt.geometry.ts` para traçados angulares e `electric-trail.animations.ts` para um pool de oito descargas SVG. A telemetria externa dos chaveiros alimenta o efeito, sem observar a flutuação. Eventos nativos de scroll controlam a emissão, e máscaras protegem os conteúdos medidos. A região da máscara acompanha somente as descargas ativas e fica vazia após o fade. Pequenos deslocamentos se acumulam por integrante até atingir o limiar de emissão. Movimento reduzido, cores forçadas e visibilidade interrompem o efeito. Ajustes ficam em `animation.config.ts`, no bloco `electricity`.

Os tokens de cor amostrados e os valores visuais provisórios estão comentados em `src/styles/_tokens.scss`. A fonte de sistema atual é provisória: não representa uma identificação da fonte do mockup.

`animation.config.ts` contém as durações pedidas, sem executar animações. Os parâmetros de trajetória e eletricidade ainda dependem do ajuste visual final em navegador. GSAP/ScrollTrigger são carregados na landing e inicializados após render. A flutuação usa somente GSAP nos wrappers internos, sem controlar a trajetória e sem disputar transforms com os wrappers externos. A página do curso continua sem as animações complexas. Os contexts, triggers e listeners próprios são limpos ao destruir a página.

O estado da transformação e das entradas fica no serviço AnimationSessionService em memória, compartilhado entre rotas. Assim, navegar para o curso e voltar não reinicia a transformação ou as entradas; recarregar o documento permite nova execução. Não usar armazenamento persistente para esse estado.

## Pendências visuais

- Original transparente da pessoa: o PNG recebido contém xadrez incorporado. O catálogo marca `renderAllowed: false`; ele não é renderizado.
- Chaveiro e4KC Motorsport difere do C4K Marketing dos mockups.
- Família/arquivo da fonte ainda não fornecidos.
- Fundos, divisórias, pedestais e ícones sociais tridimensionais não foram fornecidos separadamente.
- URLs comerciais e dados definitivos do curso ainda vazios.

Os originais continuam preservados em `/workspace/assets/3d-flash`. Nenhuma imagem foi recortada, regenerada ou otimizada nesta etapa.

## Acessibilidade e validação

A base usa `lang="pt-BR"`, HTML semântico, títulos por rota, foco visível e link para pular ao conteúdo sem trocar de rota. A rolagem suave respeita `prefers-reduced-motion`.

Os testes de integração de rotas usam Angular RouterTestingHarness e Vitest/JSDOM. Não são testes em navegador real. O ambiente gerenciado não disponibilizou a ferramenta de navegador `cua_repl.js`; não foi iniciado um servidor paralelo como alternativa. A comparação visual, os testes de viewport e a verificação da hospedagem continuam pendentes para as próximas etapas.

A Etapa 7 reúne 149 testes em dezenove arquivos, incluindo integração entre viagem, flutuação e raios, estrutura acessível das rotas e entradas secundárias. As varreduras geométricas cobrem 14 larguras simuladas. Isso não substitui a inspeção visual, a auditoria com leitor de tela ou a medição de desempenho em dispositivos. A matriz de evidências e pendências está em `docs/ETAPA-7.md`.

## Preparar publicação

Execute `npm run release:check` para conferir formatação, testes, build e referências estáticas. O guia de hospedagem, fallback para `/curso`, configurações finais e manutenção está em [docs/PRODUCAO.md](docs/PRODUCAO.md). O inventário com SHA-256 do compilado fica em `docs/release-manifest.json`.

A Etapa 8 entrega fontes e build em ZIPs separados para revisão. Não houve publicação. A conclusão definitiva depende dos assets corretos, dados comerciais e validação visual descritos no guia.
