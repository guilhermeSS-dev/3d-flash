# Subetapa 6.5 — Formação horizontal no Contato

## Entrega

Os cinco chaveiros disponíveis se reorganizam em uma fileira na área reservada abaixo dos botões sociais. As peças mantêm suas proporções e continuam flutuando pelos wrappers internos.

A transição acompanha o mesmo progresso de scroll da viagem. Ao subir, a fileira se desfaz e os integrantes retornam pelos corredores. Não há eventos de entrada que reiniciem a formação, timers separados ou troca de pai no DOM.

## Chegada em duas fases

Os atrasos diminuem gradualmente a partir do ponto `contact-right`, por uma função smoothstep. O progresso local de cada integrante permanece monotônico e chega a 1 junto ao progresso mestre. Isso mantém o contrato normalizado de 0 a 1 e permite preservar o estado nos recálculos.

Cada integrante continua na polilinha até alcançar `contact-arrival-right`, na altura central da reserva. Somente o último trecho horizontal é substituído pelo deslocamento até seu lugar na fileira. Não existe interpolação diagonal sobre textos ou botões.

O último segmento recebe pelo menos 14% do tempo da timeline, evitando que o peso horizontal reduzido da viagem comprima a formação em um intervalo muito curto. Esse parâmetro fica em `formationScrollShare`, com ajuste visual fino pendente.

## Geometria da fileira

`keychain-formation.geometry.ts` calcula os centros dos integrantes pela área medida e pelas dimensões compactadas, incluindo os extremos de flutuação e rotação. A ordem dos assets é preservada da esquerda para a direita; todos os centros externos terminam na mesma altura.

O espaço desejado entre peças corresponde a 0,35 da largura do envelope individual. Se a reserva for estreita ou baixa, o conjunto e seus espaços são reduzidos uniformemente, sem ampliar os objetos além da pose de viagem. A proporção de cada imagem é preservada.

O adaptador publica o retângulo completo da reserva. Uma mudança somente em sua largura invalida o cache mesmo quando seu centro e a polilinha permanecem iguais. O snapshot mantém `position` como ponto nominal da rota central; as posições individuais da fileira são resolvidas pelo driver.

A geometria exige que a reserva inteira comece abaixo dos conteúdos protegidos do Contato e caiba dentro da seção e da largura da página. Uma área inválida, chegada diagonal ou formação sem espaço útil conserva o grupo estático no Hero.

## Ciclo de vida e acessibilidade

As poses são calculadas com medidas em cache; não existem leituras de layout por frame. A flutuação permanece independente da trajetória e do alinhamento. Refreshs mantêm o progresso mestre, inclusive no fim da formação, e recalculam os lugares conforme a nova área.

Movimento reduzido mantém a apresentação estática no Hero. Os estilos originais e suas prioridades são restaurados no cleanup ou descarte de integrantes; os recursos GSAP próprios continuam sendo limpos na navegação entre rotas.

## Arquivos

Criados:

- `keychain-formation.geometry.ts` e respectivo teste: cálculo puro da fileira, limites e redução proporcional.
- Este relatório.

Atualizados:

- `keychain-scroll.animations.ts` e teste: redução dos atrasos, chegada horizontal, lugares individuais e peso final de scroll.
- `keychain-route-layout.ts` e teste: área completa nos metadados e invalidação por largura.
- `keychain-route.geometry.ts` e teste: proteção da reserva contra sobreposição com Contato ou saída da seção.
- `keychain-group-sweep.spec.ts`: limites da formação final, espaçamento e reversibilidade tardia.
- `keychain-scroll-sweep.spec.ts`: metadados da área reservada.
- `animation.config.ts`: `formationGapRatio` e `formationScrollShare`.
- README e acompanhamento das etapas.

Nenhuma imagem modificada, nenhuma dependência adicionada e nenhuma publicação realizada.

## Verificações executadas

- Build de produção aprovado sem avisos de budget: bundle inicial de 240,29 kB; chunk da landing de 176,28 kB.
- 97 testes aprovados em quatorze arquivos.
- Oito testes do cálculo da fileira, incluindo cinco larguras, redução por restrição de largura/altura, espaçamento, proporções, membro único e entradas inválidas.
- Dezesseis testes do driver, incluindo formação final, retorno, chegada sem atalhos diagonais, posição inicial restaurada no fim, recálculo com redução da fileira e preferência de movimento reduzido.
- Vinte e dois testes de geometria e adaptação do layout, incluindo reserva abaixo dos controles, limites da seção e mudança de largura sem alterar a rota central.
- Varredura dos cinco integrantes nas larguras 320, 390, 768, 1024 e 1440 px, com pelo menos 10.020 envelopes por cenário. Inclui extremos de flutuação/rotação, oito obstáculos representativos, alinhamento e espaçamento finais, contenção na reserva e ida/volta em 94%, 98% e 100% da timeline.
- Testes anteriores de rotas, menu, curso, capinha e flutuação continuam aprovados.
- Formatação verificada com Prettier.

## Limites e próxima subetapa

Os testes usam a timeline GSAP real com geometrias e callbacks do ScrollTrigger simulados em JSDOM. As projeções matemáticas não equivalem a uma renderização do site. Não houve inspeção visual, scroll físico em dispositivo ou medição de FPS.

A ferramenta `cua_repl.js` continua indisponível; a [skill Sites](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) determina: “If `cua_repl.js` is unavailable, skip browser QA: do not start a preview server, install a browser, or improvise another browser-control path.” A comparação com os mockups e o ajuste fino das velocidades e dos espaços permanecem pendentes.

A trajetória e a fileira passaram nas verificações automatizadas disponíveis. O rastro elétrico não foi implementado nesta entrega; corresponde à 6.6. Continuam pendentes a pessoa transparente, o sexto chaveiro correto, a fonte e os elementos decorativos originais registrados no inventário.

Aguardar autorização para a 6.6, conforme o fluxo solicitado.
