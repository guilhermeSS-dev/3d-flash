# Etapa 3 — Página do curso

## Entrega

A rota `/curso` passou da tela técnica inicial para uma página dedicada, simples e responsiva, com identidade da marca:

- Logo original e apresentação configurável.
- Nome, duração e introdução comerciais mantidos vazios no arquivo de configuração.
- Placeholders discretos: título genérico “Curso 3D Flash”, aviso de nome definitivo pendente, duração “A definir” e descrição em breve.
- Primeiro botão “Quero me inscrever no curso”.
- Quatro módulos provisórios em acordeão, com títulos sugeridos pelo usuário e descrições Lorem Ipsum.
- Segundo botão com exatamente a mesma configuração de destino.
- Link “Voltar ao início” via Angular Router.
- Sem menu flutuante, animações complexas, formulário ou informações comerciais inventadas.

Nenhuma imagem original foi alterada; a landing e suas pendências visuais continuam preservadas. Não houve publicação.

## Arquivos criados ou alterados

Criados:

- `src/app/features/course/models/course-module.ts`
- `src/app/features/course/data/course.data.ts`
- `src/app/features/course/components/course-info/course-info.{ts,html,scss}`
- `src/app/features/course/components/course-accordion/course-accordion.{ts,html,scss,spec.ts}`
- `src/app/features/course/components/enrollment-button/enrollment-button.{ts,html,scss,spec.ts}`
- `src/app/features/course/pages/course-page/course-page.scss`

Atualizados:

- `course-page.ts` e `course-page.html`: composição da página e compartilhamento de configuração.
- `src/app/app.routes.spec.ts`: navegação e integração da página do curso.
- `src/styles/_tokens.scss`: tons de texto secundário e borda da página do curso.
- `src/styles/_global.scss`: texto acessível visualmente oculto e remoção das classes técnicas que não são mais utilizadas.
- README e acompanhamento das etapas.

Nenhuma dependência adicionada.

## Configuração e manutenção

- `site.config.ts > course`: editar `name`, `duration` e `introduction`. Os campos continuam vazios na entrega.
- `site.config.ts > links.hotmart`: configurar o destino externo uma única vez. Ambos os botões recebem esse mesmo valor.
- `course.data.ts > courseModules`: editar os quatro títulos e descrições. Preservar IDs únicos dos módulos.

Os botões de inscrição permanecem nativamente desabilitados quando a URL está vazia ou inválida. Destinos aceitos são URLs HTTPS absolutas sem credenciais embutidas. A URL é normalizada antes de receber `href`. O link abre em nova aba com `rel="noopener noreferrer"`; o texto visual não menciona o provedor. O endereço `example.test` aparece apenas em testes isolados, nunca na interface ou configuração de produção.

## Acordeões

Cada título usa um botão nativo dentro de um `h3`, com `aria-expanded` e `aria-controls`. O painel recebe ID estável, `role="region"` e `aria-labelledby`. Painéis fechados têm `aria-hidden`, `inert` e visibilidade controlada para impedir interação enquanto recolhidos.

Abrir e fechar usam CSS Grid `0fr ↔ 1fr`, opacidade e transição de 180 ms. `prefers-reduced-motion` desativa as transições. Vários módulos podem ficar abertos independentemente.

Tab, Enter e Espaço seguem o comportamento do botão nativo. As setas movem o foco entre cabeçalhos; Home/End levam ao primeiro/último. Não há listeners globais nem timelines GSAP.

## Verificações executadas

- Build de produção aprovado, sem warnings de budget.
- 17 testes aprovados em quatro arquivos Vitest/JSDOM.
- Testes cobrem rotas, retorno ao início, dois CTAs da landing, mesma configuração nas duas inscrições, ausência de menu no curso, estados de inscrição sem URL ou com URL HTTPS, rejeição de destinos inválidos, abertura/fechamento dos módulos, associação ARIA, estado `inert` e foco via setas/Home/End.
- Formatação verificada com Prettier.
- Revisão de código de acessibilidade, configurações, URLs e estilos sem defeitos concretos encontrados.

Não houve teste em navegador real: nenhum screenshot, inspeção de overflow/viewport, medição visual das transições ou exercício de Tab/Enter/Espaço no navegador foi executado. Os testes em JSDOM verificam o código e os estados DOM, não substituem esses ensaios.

A ferramenta `cua_repl.js` continua ausente no ambiente gerenciado. A regra da skill Sites e o motivo para não iniciar um navegador alternativo estão registrados em [ETAPA-2.md](ETAPA-2.md#não-verificado-em-navegador).

## Próxima etapa

Etapa 4: menu flutuante, âncoras, rotas e ajustes nas larguras intermediárias. Aguardar autorização do usuário antes de iniciar.
