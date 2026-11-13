# Subetapa 6.7 — Otimização e sobreposições

## Entrega

O rastro elétrico passa a declarar uma região de máscara limitada à união das descargas ativas, em vez de cobrir toda a altura da landing. O retângulo inclui as ramificações, os traços angulares e o halo; é recortado pelos limites da superfície e atualizado somente ao emitir ou concluir uma descarga.

Quando a última descarga termina, a máscara fica com área zero. O pool permanece com oito grupos reutilizáveis, sem criar nós durante os frames de movimento. Os retângulos pretos de proteção dos conteúdos e a margem de 8 px continuam aplicados ao efeito inteiro, incluindo o brilho.

Isso reduz a área declarada que precisa ser mascarada. Não foi medida a economia real de GPU, memória ou FPS em navegador.

## Correção do scroll lento

Na versão anterior, um movimento menor que 3 px era descartado e sua posição substituía a referência a cada atualização elegível. Com vários passos de 1 px, a descarga poderia nunca aparecer.

Agora cada integrante preserva sua referência até emitir. Pequenos deslocamentos se acumulam, e a referência é atualizada individualmente após a emissão. O progresso estático continua sem gerar raios, e resets/redimensionamentos reestabelecem a referência sem desenhar trajetos artificiais. Essa mudança também evita reconstruir o Map de referências em cada atualização normal.

## Sobreposições e ciclo de vida

A varredura do percurso dos cinco chaveiros foi ampliada para 14 larguras: 320, 360, 390, 480, 600, 767, 768, 820, 1023, 1024, 1280, 1440, 1920 e 2560 px. Os cenários incluem os dois lados dos breakpoints principais.

As projeções matemáticas não encontraram invasão dos oito obstáculos representativos de textos, produtos e botões. Foram mantidos os extremos de flutuação/rotação, a contenção horizontal e o alinhamento/espaçamento da fileira final. Não foi necessário alterar a composição visual nesta etapa.

Novas regressões verificam:

- Região da máscara reduzida, contendo os pontos dos raios e liberada após o fade.
- Máscara de proteção reconstruída no redimensionamento, aguardando posições atuais antes de emitir.
- Pausa fora da área visível e retomada com referência atualizada.
- Desativação e reconstrução do pool em cores forçadas.
- Ciclos repetidos de montagem e destruição sem nós SVG ou tweens antigos na timeline global.
- Movimento lento acumulado, mantendo objetos parados sem descargas.

## Arquivos

Atualizados:

- `electric-trail.animations.ts`: região da máscara por descargas ativas e referências de emissão por integrante.
- `electric-trail.animations.spec.ts`: seis novas regressões de otimização, pausa e limpeza.
- `keychain-group-sweep.spec.ts`: varredura ampliada de cinco para 14 larguras.
- README e acompanhamento das etapas.

Criado este relatório. Nenhuma dependência, imagem ou informação comercial foi alterada. Não houve publicação.

## Verificações

- Build de produção aprovado sem avisos de budget: bundle inicial de 240,32 kB e chunk da landing de 185,00 kB.
- 133 testes aprovados em dezesseis arquivos.
- Quatorze cenários de varredura do grupo, com pelo menos 10.020 envelopes por largura, preservando as verificações de obstáculos, ida/volta, extremos de flutuação e formação final.
- Quatorze testes do renderer elétrico, incluindo as seis regressões novas desta subetapa.
- A verificação da região SVG confirma área menor que um décimo da superfície no cenário de uma descarga; isso mede os atributos da máscara, sem estimar ganho real de GPU.
- Testes anteriores de curso, menu, rotas, transformação da capinha, flutuação e limpeza continuam aprovados.
- Formatação verificada com Prettier.

## Limites e entrega

As geometrias são simuladas em JSDOM e os testes usam GSAP real com callbacks controlados. Não houve inspeção visual em navegador, scroll físico em dispositivo, medição de FPS, Lighthouse ou comparação final com os mockups.

A ferramenta `cua_repl.js` continua indisponível; a [skill Sites](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) determina: “If `cua_repl.js` is unavailable, skip browser QA: do not start a preview server, install a browser, or improvise another browser-control path.” Assim, os resultados geométricos não são apresentados como aprovação visual ou de desempenho em dispositivos reais.

Continuam pendentes os assets originais já registrados, a definição dos links/dados comerciais e as verificações visuais. A implementação das subetapas 6.1 a 6.7 está entregue com os limites descritos; os critérios finais de aceitação ainda dependem dessas pendências.

O ZIP da 6.7 contém código, imagens, testes, configurações, lockfile e documentação, sem dependências instaladas, saída de build ou caches. Aguardar autorização para a Etapa 7 — testes e otimização da aplicação.
