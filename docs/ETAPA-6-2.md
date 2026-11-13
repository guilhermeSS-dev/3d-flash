# Subetapa 6.2 — Geometria responsiva do percurso

## Entrega implementada

Foi criado e integrado o cálculo do percurso em zigue-zague. Ele usa as posições reais das seções, da área ilustrada do Hero, dos conteúdos protegidos e da reserva abaixo das redes sociais.

Sequência calculada:

1. Centro inicial do chaveiro condutor no Hero.
2. Avanço pela área à frente da pessoa, ainda dentro da composição do Hero.
3. Corredor direito e passagem pela seção Sobre.
4. Travessia para a esquerda numa faixa livre antes do Curso.
5. Entrada e passagem pelo lado esquerdo do Curso.
6. Nova travessia para a direita antes do Contato.
7. Chegada à área reservada abaixo dos botões sociais.

Os trechos são segmentos contínuos. A amostragem usa distância percorrida, sem saltos entre os pontos. Os mesmos pontos podem ser percorridos nos dois sentidos.

**Esta entrega prepara a geometria; ainda não liga o deslocamento dos objetos ao scroll.** Os chaveiros continuam flutuando no Hero. O controle pela rolagem pertence à 6.3; o movimento completo do grupo e a formação horizontal pertencem às 6.4 e 6.5. Não há rastro elétrico nesta subetapa.

## Proteção do conteúdo

Textos, CTAs, produtos e redes sociais têm marcadores internos de área ocupada. O planejador expande essas áreas pelo espaço necessário ao objeto e pela margem de segurança, verificando todos os segmentos do percurso.

Os corredores laterais usam medidas fluidas. Se faltar altura para uma travessia, o cálculo informa o déficit e o adaptador acrescenta somente o espaço necessário. A chegada também recebe altura mínima compatível.

No Hero mobile, o marcador de conteúdo foi colocado num wrapper interno. Assim, o padding que reserva o corredor não é confundido com texto ocupado.

Geometrias inconsistentes ou com colisões retornam `valid: false` e uma lista de motivos. O código não apresenta uma rota obstruída como livre.

## Recálculo e progresso

`setupKeychainRouteLayout` mantém um cache com rota, progresso e posição amostrada. O método `setProgress` usa somente esse cache: não consulta layout nem altera a interface.

O cache é atualizado após resize, orientação, mudanças observadas de tamanho, carregamento de imagens e conclusão de fontes. As invalidações são agrupadas por requestAnimationFrame.

A medida usa a cadeia de offsets para ignorar os deslocamentos temporários das entradas GSAP. Mudanças da geometria notificam os ScrollTriggers existentes para recalcular as posições das animações da Etapa 5; atualizações de progresso não provocam esse refresh.

Para calcular os déficits, os espaços adicionados anteriormente são subtraídos matematicamente das medidas. Eles não são zerados temporariamente no DOM. Isso evita reduzir artificialmente a altura da página durante a medição.

O progresso normalizado é preservado ao reconstruir a rota. Observers, eventos e frames pendentes são removidos no cleanup, que também restaura os valores CSS anteriores, inclusive prioridades.

## Arquivos criados

- `src/app/features/home/animations/keychain-route.geometry.ts`
- `src/app/features/home/animations/keychain-route.geometry.spec.ts`
- `src/app/features/home/animations/keychain-route-layout.ts`
- `src/app/features/home/animations/keychain-route-layout.spec.ts`

Arquivos atualizados:

- `FloatingKeychains`: inicialização e limpeza do cache geométrico.
- `animation.config.ts`: dimensões provisórias do envelope de viagem e margem de segurança.
- Templates do Hero, Sobre, Curso, Contato e HomePage: referências de medição.
- SCSS dessas regiões: corredores e espaços de travessia/chegada.
- README e acompanhamento das entregas.

Nenhuma dependência adicionada, nenhuma imagem alterada e nenhuma publicação realizada.

## Verificações executadas

- Build de produção aprovado sem warnings de budget.
- 58 testes aprovados em dez arquivos.
- Motor puro: cenários sintéticos de 320, 390, 768, 1024 e 1440 px, percurso direita/esquerda/direita, limites, colisões ao longo dos segmentos, espaço insuficiente, entradas inválidas, pontos horizontais e amostragem reversa.
- Adaptador: dimensões ausentes, reserva de espaços, progresso preservado, cache sem leituras DOM, eventos agrupados, offsets sem transforms, cleanup e restauração de CSS.
- Regressão: um refresh idêntico mantém os espaços reservados sem escrevê-los novamente ou zerá-los.
- Testes anteriores de flutuação, transformação, menu, navegação, curso e inscrições continuam aprovados.
- Formatação verificada com Prettier.

## Limites

Os cenários de largura e os offsets dos testes são simulados. Eles validam o cálculo e os estados de código, não a aparência do site.

Não houve inspeção visual em navegador, medição real de overflow/scrollY, teste físico de resize, comparação com os mockups ou animação completa acompanhando a rolagem. A ferramenta `cua_repl.js` continua indisponível; a [skill Sites](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) determina “If `cua_repl.js` is unavailable, skip browser QA”.

O envelope de viagem é individual e provisório. A escala real dos assets e a ocupação do grupo precisam ser ajustadas/validadas nas próximas subetapas antes do efeito elétrico. Também permanecem pendentes a pessoa transparente, o chaveiro correto, a fonte e os demais assets já registrados.

## Próxima subetapa

6.3 — Conectar a trajetória à timeline com ScrollTrigger e scrub, garantindo ida/volta e preservação do progresso na atualização da geometria. Aguardar autorização conforme o fluxo de entregas.
