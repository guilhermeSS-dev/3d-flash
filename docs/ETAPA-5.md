# Etapa 5 — Animações secundárias e transformação

## Entrega implementada

- Abertura de 0,8 s no logo e no conteúdo do Hero, mantendo fundo e menu imediatamente disponíveis.
- Entradas de 0,4 s nas regiões Sobre, Curso, Contato e Rodapé, sem animar as seções inteiras.
- Entradas consumidas uma única vez por carregamento, inclusive ao navegar para o curso e retornar.
- Transformação do modelo azul para a capinha física, com timeline GSAP de exatamente 2 s.
- Transformação iniciada apenas em entrada descendente ativa da seção Curso, após as duas imagens estarem carregadas. Se a seção já estiver visível no scroll zero, aguarda a primeira descida.
- Estado final preservado ao subir o scroll ou remontar a landing, inclusive se a navegação interromper a animação.
- Movimento reduzido mantém conteúdo e capinha final estáticos, sem reativar efeitos já consumidos.
- Limpeza de contexts, triggers, listeners de foco/mídia e esperas de imagens ao destruir a página/componente.

Não foram iniciadas a flutuação dos chaveiros, a trajetória ou as descargas da Etapa 6. Nenhuma imagem foi editada, nenhuma dependência foi adicionada e não houve publicação.

## Arquivos

Criados:

- `src/app/core/services/animation-session.service.ts` e teste.
- `src/app/features/home/animations/home-entrance.animations.ts`.
- `src/app/features/home/animations/phone-case-transformation.animations.ts` e teste.
- `src/app/features/home/components/phone-case-transformation/phone-case-transformation.{ts,html,scss}`.

Atualizados:

- `HomePage`: inicialização após render e fora da zona Angular, com cleanup no destroy.
- `CoursePreviewSection`: componente de transformação, referência à seção e área integrada ao grid.
- README e acompanhamento de etapas.

## Abertura e entradas

Markup continua visível por padrão. GSAP aplica somente pequenas variações de transform e opacity, sem bloquear navegação ou inserir uma tela de carregamento.

A abertura é omitida quando já existe fragmento, posição restaurada ou foco no Hero. Conteúdo já alcançado permanece visível. Entrada por subida também não oculta conteúdo. Receber foco finaliza imediatamente qualquer fade em andamento na região, preservando a leitura e os controles.

Os efeitos usam `gsap.context`, `gsap.matchMedia` e ScrollTrigger com execução única. O estado compartilhado impede repetição entre rotas. Só os elementos de apresentação são animados: não há disputa com o menu, pessoa ou wrappers dos chaveiros.

## Transformação

As duas imagens originais estão sobrepostas, alinhadas pelas margens transparentes, com troca de opacidade e escala discreta. As duas transições começam no tempo zero e duram 2 s; não há modelo 3D ou efeito elétrico.

A área antes vazia à esquerda do Curso passou a ser um item do grid. No mobile fica na coluna esquerda da linha da plaquinha. Assim, o produto permanece separado dos textos e do CTA, inclusive com texto ampliado. Essa integração dá espaço ao requisito de transformação sem retirar a plaquinha aprovada; sua aparência ainda exige comparação em navegador.

A classe CSS padrão mostra a capinha física. Se movimento reduzido estiver ativo, ou se a transformação já tiver começado na sessão, não é criada uma nova timeline. O estado é consumido ao iniciar, e não ao terminar: abandonar a página no meio dos dois segundos não permite reinício ao voltar.

Esperas de imagens são canceladas no cleanup. Se a imagem azul falhar e a física carregar, a física permanece visível; se apenas a azul carregar, ela continua visível. Esse caminho não consome a execução, permitindo tentativa em uma futura montagem.

## Estado e configurações

`AnimationSessionService` é `providedIn: 'root'` e guarda estado somente em memória. Não usa localStorage ou sessionStorage. Recarregar o documento cria uma nova sessão.

Durações continuam em `core/config/animation.config.ts`. GSAP e ScrollTrigger são carregados junto à landing; a página exclusiva do curso permanece sem essas animações.

## Verificações executadas

- Build de produção aprovado sem warnings de budget.
- 36 testes aprovados em sete arquivos.
- Serviço: execução única, compartilhamento com injetor de rota, nova aplicação limpa e independência das entradas.
- Transformação: GSAP real com `timeline.totalDuration() === 2`, avanço controlado até o estado final, entrada descendente ativa, espera pela primeira descida em viewport alto, ausência de reinício, interrupção/remontagem, movimento reduzido, espera/cancelamento de imagens e fallback de falha.
- Nos testes da transformação, `ScrollTrigger.create` e o registro do plugin são controlados por spies. Os callbacks de entrada e as preferências de mídia são simulados. Portanto, esses testes não validam rolagem física ou integração real de ScrollTrigger com o viewport.
- Testes existentes de menu, rotas, inscrições, foco e acordeões continuam aprovados.
- Formatação verificada com Prettier.
- Revisão de código identificou e corrigiu o fallback de imagem digital com erro que podia ocultar a imagem física disponível.

O bundle lazy da landing contém GSAP/ScrollTrigger. O build reporta aproximadamente 154 kB brutos e 50 kB de transferência estimada para esse chunk; não é uma medição de desempenho em dispositivo.

## Limites

Não houve screenshot, teste real de scroll, comparação visual, medição de duração percebida, ensaio de mídia do sistema em tempo real ou avaliação de desempenho no navegador. A abertura e as entradas foram compiladas e revisadas; sua aparência não foi testada visualmente.

A ferramenta `cua_repl.js` continua ausente. A skill [Sites](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) determina “If `cua_repl.js` is unavailable, skip browser QA”, sem permitir substituir esse caminho por navegador/servidor alternativo neste ambiente gerenciado.

Persistem as pendências de pessoa transparente, chaveiro divergente, fonte e elementos decorativos já registradas. A fidelidade final do conjunto continua pendente.

## Próximo passo

Etapa 6: posicionamento e flutuação, trajetória responsiva, scroll reversível, grupo e formação final; validar a trajetória antes de criar o rastro elétrico. Aguardar autorização do usuário.
