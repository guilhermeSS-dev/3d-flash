# Etapa 4 — Navegação e responsividade

## Entrega implementada

O ícone decorativo da landing foi substituído por um menu flutuante funcional:

- Botão fixo no canto superior direito usando o PNG original dos três raios.
- Dropdown compacto diretamente abaixo, sem alterar o fluxo da página.
- Cascata de aproximadamente 250 ms.
- Fecha pelo próprio botão, clique fora, seleção, Escape ou saída de foco por teclado.
- Escape devolve o foco ao botão sem deslocar a página.
- Botão nativo com `aria-expanded` e `aria-controls`; links nativos em um `nav`.
- Painel fechado recebe `inert`, `aria-hidden` e links com `tabindex="-1"`.
- Sem bloqueio da tela ou aprisionamento de foco.
- Movimento reduzido desativa as transições.
- Menu montado somente na landing, acima das camadas decorativas e fora do contêiner com `overflow: clip`.
- O cabeçalho com o logo continua pertencendo ao Hero e sai naturalmente da tela com a rolagem.

Nenhuma dependência adicionada, nenhuma imagem alterada e nenhuma publicação realizada.

## Âncoras e histórico

As cinco opções usam Angular RouterLink e fragmentos reais: `inicio`, `sobre`, `curso`, `contato` e `rodape`. Selecionar Curso no menu navega para a seção da landing; os CTAs continuam levando à página `/curso`.

Os quatro elementos `section` e o `footer` têm `tabindex="-1"`, permitindo que o ViewportScroller mova o foco ao destino. Eles não entram na sequência normal de Tab.

A versão instalada Angular 22.2.6 já agenda a rolagem de fragmentos mesmo em NavigationSkipped por URL repetida. Não foi adicionada rolagem duplicada, recarregamento da rota ou assinatura global de NavigationEnd.

O offset de âncora lê a posição inferior real do botão mais uma folga de 16 px somente quando uma âncora é acionada. Isso mantém o título abaixo do controle flutuante e adapta a folga à geometria atual, inclusive após resize. Na destruição do menu, o offset é zerado. Listeners do template/host são removidos pelo Angular.

A configuração existente preserva a posição no retorno pelo histórico. O RouterScroller instalado prioriza posições restauradas com comportamento instantâneo. Rolagem suave de âncoras vem do CSS global e passa a automática em `prefers-reduced-motion`.

## Ajustes responsivos

Revisão estática das regras para 320, 390, 480, 768, 1024, 1440 e 1920 px, incluindo estimativas para texto ampliado:

- Removido o mínimo global de 20rem do body, que poderia forçar overflow com fonte raiz ampliada.
- Hero e título do Curso permitem quebra de palavras quando estritamente necessário.
- Labels dos CTAs podem encolher/quebrar entre os ícones.
- Rodapé permite quebra de palavras longas.
- Contato empilha texto e redes abaixo de 22rem, preservando os alvos de toque.
- Cabeçalho reserva espaço real para o botão flutuante, sem fixar o logo.
- Dropdown usa largura limitada ao viewport, limite de altura com rolagem interna e safe areas.

Esses ajustes foram implementados por análise do código. Não constituem medições em telas renderizadas.

## Arquivos

Criados:

- `src/app/core/config/navigation.config.ts`
- `src/app/shared/components/floating-menu/floating-menu.{ts,html,scss,spec.ts}`

Alterados:

- HomePage: integração do menu fora do fundo isolado e remoção do ícone decorativo antigo.
- Templates das cinco regiões: alvos de foco.
- SCSS do Hero, curso, contato, rodapé e botão compartilhado.
- Tokens globais: dimensões e margens do controle.
- Estilos globais: tamanho mínimo e foco das regiões.
- Testes de integração de rotas e documentação.

Para editar rótulos, utilize `navigation.config.ts`. Mantenha IDs compatíveis com os elementos das seções.

## Verificações executadas

- Build de produção aprovado sem warnings de budget.
- 25 testes aprovados em cinco arquivos Vitest/JSDOM.
- Testes do menu: estados inicial/aberto/fechado, clique dentro/fora, Escape e retorno do foco, saída de foco, seleção, offset com geometria simulada e limpeza.
- Integração: as cinco âncoras existem, são focáveis, recebem o fragmento correto, fecham o menu e aceitam seleção repetida.
- O foco dos alvos foi exercitado pela API pública ViewportScroller em JSDOM, com `window.scrollTo` substituído por spy. Não representa um teste de rolagem física.
- Rota do curso continua sem menu; CTAs e inscrições existentes continuam cobertos.
- Formatação verificada com Prettier.
- Revisão de código sem defeitos concretos adicionais encontrados.

## Limites e pendências

Não houve teste visual em navegador, screenshot, medição real de overflow, sobreposição, safe area, trajetória suave ou duração da cascata. A ferramenta `cua_repl.js` continua indisponível no ambiente gerenciado.

A skill [Sites](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) exige: “If `cua_repl.js` is unavailable, skip browser QA: do not start a preview server, install a browser, or improvise another browser-control path.” Assim, não foi criado um navegador/servidor alternativo para apresentar esses testes como executados.

Continuam pendentes os assets e a fonte já registrados na Etapa 2. Os corredores definitivos dos chaveiros dependerão da geometria validada na Etapa 6.

## Próximo passo

Etapa 5: abertura, entradas discretas e transformação da capinha. Aguardar autorização do usuário.
