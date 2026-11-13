# Subetapa 6.4 — Movimento dos chaveiros em grupo

## Entrega

Os cinco chaveiros disponíveis acompanham o condutor pela mesma trajetória responsiva. Uma única timeline GSAP/ScrollTrigger controla o progresso mestre; cada seguidor amostra a polilinha em uma posição ligeiramente anterior, com atraso medido em distância de arco.

O atraso depende das dimensões compactadas dos integrantes, sem depender da altura da página, da velocidade do scroll ou da taxa de frames. Os parâmetros `followSpacingRatio` (0,82) e `followSpacingWidthFloor` (0,8) ficam em `animation.config.ts`, com ajuste visual ainda provisório.

Cada integrante permanece na rota validada, inclusive nos cantos. Não foram adicionados offsets laterais aos corredores nem ampliados os espaços das seções para acomodar a união do grupo.

## Hero e proporções

Cada chaveiro começa na própria posição e rotação do Hero. Após seu pequeno atraso, percorre uma captura linear até o ponto frontal da cena; a diferença entre sua origem e a do condutor desaparece antes dos corredores.

A escala é calculada individualmente, incluindo os extremos da flutuação e rotação internas. Isso acomoda as diferentes proporções dos assets sem distorção. A pose inicial, o avanço de escala 1,04 e a compactação para viagem permanecem separados da flutuação contínua.

Uma colisão matemática de aproximadamente 1,5 px foi encontrada no V Motos, na pose inicial, nas larguras de 768 e 1024 px. Seu recuo horizontal desktop foi ajustado de 4% para 5% da cena; a posição mobile de 8% permanece igual.

## Cache e ciclo de vida

O adaptador geométrico mede e observa todos os wrappers que contêm imagem. Seus IDs e retângulos lógicos são publicados no snapshot; uma alteração somente nas dimensões de um seguidor também invalida o cache, mesmo quando o percurso mestre permanece igual.

Não existem leituras de layout nos frames da viagem. O render modifica apenas o transform externo de cada integrante. A flutuação interna e a normalização das imagens continuam independentes.

Subir desfaz a viagem pela mesma função de progresso, sem reiniciar ou criar timers individuais. Refreshs preservam o progresso mestre e recalculam as poses do grupo. A remoção de um membro dos metadados restaura seus estilos anteriores, inclusive prioridades, evitando resíduos de transform.

Movimento reduzido mantém os objetos estáticos no Hero. Cleanup elimina somente a timeline, o trigger e o scrub próprios e restaura os estilos de todos os integrantes. O sexto asset bloqueado continua sem imagem e fora do grupo.

## Arquivos

- `keychain-scroll.animations.ts` e teste: movimento de todos os integrantes, captura, escala, atraso e restauração.
- `keychain-route-layout.ts` e teste: medição, observação e invalidação dos seguidores.
- `animation.config.ts`: parâmetros de espaçamento do grupo.
- `floating-keychains.scss`: pequeno afastamento inicial do V Motos no desktop.
- `keychain-scroll-sweep.spec.ts`: metadados atualizados para o contrato do grupo.
- `keychain-group-sweep.spec.ts`: varredura do percurso completo dos cinco integrantes.
- README e acompanhamento das etapas.

Nenhuma imagem alterada, nenhuma dependência adicionada e nenhuma publicação realizada.

## Verificações

- Build de produção aprovado, sem avisos de budget. Bundle inicial de 240,29 kB; chunk da landing de 173,01 kB.
- 81 testes aprovados em treze arquivos, incluindo os testes anteriores de rotas, menu, curso, capinha e flutuação.
- Onze testes do driver: ida/volta, origens individuais, atraso na mesma polilinha, ajuste por proporção, exclusão de itens indisponíveis, refresh, ausência de medições por frame, restauração e movimento reduzido.
- Nove testes do adaptador geométrico, incluindo observação dos seguidores e invalidação por mudança de dimensão sem alteração da rota mestre.
- Cinco cenários de varredura do grupo nas larguras de 320, 390, 768, 1024 e 1440 px. Pelo menos 10.020 envelopes verificados por cenário, com extremos de flutuação/rotação e oito obstáculos representativos de textos, produtos e botões. Foram incluídas as juntas individuais dos seguidores e os limites da captura, além de 501 amostras gerais por cenário.
- Verificação de reversibilidade das poses do grupo e exclusão do sexto asset sem imagem.
- Formatação verificada com Prettier.
- Revisão independente identificou o resíduo de transform em membros descartados; correção e teste de regressão aprovados.

## Limites e próxima subetapa

As medidas dos testes são simuladas em JSDOM; a timeline GSAP é real, com criação e callbacks do ScrollTrigger controlados. A projeção dos retângulos e de seus extremos de flutuação não equivale à renderização do site em um navegador.

Não houve inspeção visual, scroll físico em dispositivo ou medição de FPS. A ferramenta `cua_repl.js` continua indisponível; a [skill Sites](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) determina: “If `cua_repl.js` is unavailable, skip browser QA: do not start a preview server, install a browser, or improvise another browser-control path.” A comparação com os mockups e o ajuste visual fino do espaçamento permanecem pendentes.

Nesta subetapa, os seguidores mantêm seus atrasos até o fim do percurso. A formação horizontal completa abaixo dos botões sociais pertence à 6.5. O rastro elétrico não foi implementado; pertence à 6.6, após a validação do percurso.

Continuam pendentes a pessoa transparente, o sexto chaveiro correto, a fonte e os elementos decorativos originais registrados no inventário. Aguardar autorização para a 6.5, conforme o fluxo solicitado.
