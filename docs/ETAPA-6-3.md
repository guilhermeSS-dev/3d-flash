# Subetapa 6.3 — Sincronização reversível com scroll

## Entrega implementada

O chaveiro condutor (Rô Modas, com fallback para o primeiro asset renderizado) está conectado ao percurso medido da 6.2 por uma timeline GSAP e ScrollTrigger com scrub de 0,65 s.

Descer avança pelo percurso; subir retorna pelo mesmo caminho, sem reiniciar por eventos de entrada. Ao parar a rolagem, o deslocamento termina de acompanhar o scrub e a flutuação interna continua.

Esta subetapa conecta somente o condutor. Os demais chaveiros disponíveis continuam flutuando no Hero. O movimento do grupo com atrasos pertence à 6.4; a fileira final pertence à 6.5. Não foi criado efeito elétrico.

## Integração

O widget permanece no Hero: seus ancestrais permitem overflow visual até o limite da landing inteira. O condutor pode chegar ao Contato sem duplicar imagens ou trocar de pai no DOM. O menu continua acima da camada dos chaveiros.

A observação de visibilidade da flutuação agora cobre a landing inteira. Assim, sair do Hero não pausa a oscilação do objeto em viagem.

O driver modifica somente o transform do wrapper externo do condutor. O wrapper interno mantém a flutuação, e a imagem mantém a compensação das margens transparentes.

A rotação CSS individual é neutralizada enquanto o driver está ativo e incorporada ao transform na ordem translate → rotate → scale. Isso evita que a rotação inicial desvie o vetor de deslocamento para fora da trajetória.

## Timeline e escala

A timeline controla um proxy de progresso. Cada trecho tem um peso baseado principalmente na distância vertical, com contribuição horizontal de 0,08. Isso reserva tempo às travessias sem fazer os trechos horizontais longos dominarem a navegação.

O progresso de tempo da timeline é convertido em progresso de distância do percurso. Existe um mapeamento inverso para preservar a posição ao atualizar a geometria.

O condutor começa com a pose original, avança discretamente para escala 1,04 na frente do Hero e se ajusta ao envelope dos corredores antes de viajar pelas seções. A escala conserva a proporção da imagem e inclui espaço para a flutuação/rotação internas.

O intervalo de scroll usa a posição real da landing e a chegada abaixo dos botões sociais, limitada pelo alcance do documento. A inicialização usa o progresso atual do ScrollTrigger, inclusive em links profundos e retorno por rota.

## Recálculo e limpeza

O cache geométrico passou a incluir dimensões lógicas do condutor, envelope de viagem e posição da landing no documento. Mudanças nessas medidas também notificam o driver.

Ao recalcular, a timeline é reutilizada, seus segmentos são reconstruídos e o progresso de percurso é preservado. Durante refreshs do ScrollTrigger, os renders intermediários são suprimidos e o progresso é restaurado antes da escrita final do transform.

O tween de scrub antigo é explicitamente eliminado antes de substituir o trigger. Apenas o trigger/timeline próprios são limpos; não é usado killAll.

Movimento reduzido mantém o condutor estático na pose do Hero. Geometria inválida também usa essa pose segura, sem enviar o objeto por uma rota obstruída. Cleanup restaura as propriedades de estilo anteriores, inclusive prioridades, e mantém os transforms internos intactos.

## Arquivos

Criados:

- `src/app/features/home/animations/keychain-scroll.animations.ts`
- `src/app/features/home/animations/keychain-scroll.animations.spec.ts`
- `src/app/features/home/animations/keychain-scroll-sweep.spec.ts`

Atualizados:

- `FloatingKeychains`: driver de scroll, refreshs e alvo de visibilidade da flutuação.
- `keychain-route-layout.ts` e teste: metadados para o render e invalidação por tamanho do condutor.
- `animation.config.ts`: pesos de tempo, escala de avanço e posição de chegada.
- README e acompanhamento.

Nenhuma imagem alterada, nenhuma dependência adicionada e nenhuma publicação realizada.

## Verificações executadas

- Build de produção aprovado sem warnings de budget.
- 71 testes aprovados em doze arquivos.
- Sete testes do driver com GSAP real: ida/volta, posição inicial restaurada, preservação no refresh, limites de escala/scroll, ausência de leitura de layout nos frames, fallback/cleanup e movimento reduzido.
- Cinco testes de varredura matemática nas larguras 320, 390, 768, 1024 e 1440 px. Cada cenário verifica 812 envelopes nos extremos da flutuação/rotação, incluindo o avanço 1,04, sem invasão do texto do Hero ou saída horizontal. No mobile, o objeto permanece acima do texto abaixo da cena durante essa fase.
- Metadados: uma mudança de tamanho do condutor invalida a geometria mesmo quando seu centro e a rota permanecem iguais.
- Testes anteriores de navegação, menu, curso, acordeões, transformação, flutuação e geometria continuam aprovados.
- Formatação verificada com Prettier.
- Revisão de código identificou e corrigiu a preservação indevida de um scrubTween antigo durante a reconstrução.

## Limites

Os testes do driver usam a timeline real do GSAP com criação do ScrollTrigger e callbacks controlados. As medidas, preferências de mídia e os estados de scroll são simulados. A varredura projeta matematicamente os retângulos dos objetos; não é uma renderização do site.

Não houve inspeção visual em navegador, scroll físico em dispositivo, medição de FPS ou comparação final com os mockups. A ferramenta `cua_repl.js` continua indisponível; a [skill Sites](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) determina “If `cua_repl.js` is unavailable, skip browser QA”.

As garantias matemáticas desta etapa dizem respeito ao condutor e aos cenários testados. O envelope e o espaçamento de todos os integrantes deverão ser verificados na 6.4 antes do rastro elétrico.

Continuam pendentes a pessoa transparente, o sexto chaveiro correto, a fonte e os elementos decorativos originais já registrados.

## Próxima subetapa

6.4 — Movimento organizado do grupo, com pequenos atrasos ao longo do percurso e flutuação independente. Aguardar autorização conforme o fluxo.
