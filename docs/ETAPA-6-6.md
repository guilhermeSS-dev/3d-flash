# Subetapa 6.6 — Rastro elétrico amarelo

## Entrega

Descargas amarelas curtas acompanham os cinco chaveiros durante o scroll nos dois sentidos, inclusive na formação final. A geometria usa segmentos angulares irregulares e pequenas ramificações; não existe linha contínua, fumaça, partículas ou faixa permanente.

A flutuação não produz descargas. A emissão depende de atividade recente do scroll nativo e de deslocamento real do wrapper externo. Ao parar, novas emissões cessam e as existentes terminam seu fade de 0,22 s, mesmo enquanto o scrub conclui o deslocamento.

## Geometria e renderização

`electric-bolt.geometry.ts` produz de seis a nove pontos e uma ou duas ramificações angulares com seed determinístico. Comprimento e amplitude são limitados; entradas inválidas retornam resultado vazio.

O renderer reutiliza oito grupos SVG. Cada grupo possui halo amarelo com blur local, núcleo amarelo e destaque fino claro; sua opacidade é controlada por um tween numérico GSAP reutilizado. São permitidas até duas emissões por intervalo de 50 ms, com comprimento máximo de 52 px. Não são criados nós DOM durante as atualizações de movimento.

A ponta fica atrás da silhueta, calculada pela direção e dimensões do objeto, para que movimentos pequenos não escondam o raio inteiro sob a imagem. Cada descarga permanece curta e temporária.

O SVG é filho direto da landing, com origem e viewBox correspondentes à geometria medida. Uma máscara externa ao halo protege textos, produtos e botões, incluindo uma margem de 8 px. O efeito não captura ponteiros; o menu permanece acima dele.

## Integração e limpeza

O driver publica centros externos reais, dimensões e motivos `motion`/`reset`. A posição nominal da polilinha não é usada para a formação final. Inicialização, refresh, geometria inválida e cleanup não emitem trajetos artificiais.

O cache do layout compartilha dimensões da superfície e retângulos protegidos, medidos somente nos recálculos. A flutuação continua separada e não disputa transforms com o efeito.

Movimento reduzido e cores forçadas desativam o efeito. Documento oculto ou landing fora da área visível interrompem a emissão e limpam as descargas. Listeners, observer, tweens e nós próprios são removidos no cleanup; os IDs SVG são exclusivos por instância.

## Arquivos

Criados:

- `electric-bolt.geometry.ts` e teste.
- `electric-trail.animations.ts` e teste.
- `keychain-motion.model.ts`.
- Componente decorativo `electric-trail/`.
- Este relatório.

Atualizados:

- Driver de scroll e teste: telemetria real e distinção de reset.
- Adaptador de layout: superfície e obstáculos no cache.
- Fixtures das varreduras: novos metadados.
- `FloatingKeychains`: inicialização, atualização e cleanup do rastro.
- `HomePage`: overlay decorativo fora da cena do Hero.
- Configurações de animação, token de camada, README e acompanhamento.

Nenhuma imagem alterada, nenhuma dependência adicionada e nenhuma publicação realizada.

## Verificações

- Build de produção aprovado sem avisos de budget: bundle inicial 240,32 kB; landing 184,27 kB.
- 118 testes aprovados em dezesseis arquivos.
- Oito testes de geometria elétrica: irregularidade angular, ramificações, direção reversa, determinismo e limites/entradas inválidas.
- Oito testes do renderer: emissão nos dois sentidos, atividade nativa, ausência de emissão por reset/progresso estático, parada e fade, pool reciclado, máscaras, IDs exclusivos, visibilidade, movimento reduzido e cleanup.
- Vinte e um testes do driver, incluindo posições reais da fileira, motivos de reset, isolamento da flutuação e limpeza da telemetria.
- Varreduras existentes dos cinco chaveiros em cinco larguras continuam aprovadas.
- Testes de movimento reduzido respeitam o throttle nativo de dois milissegundos do GSAP entre mudanças simuladas; não foi alterado o comportamento de produção para acomodar o teste.
- Formatação verificada com Prettier.
- Revisão de código identificou e corrigiu corte abrupto do fade e raios curtos escondidos pela imagem.

## Limites e entrega

As verificações automatizadas usam JSDOM, geometria numérica e timelines GSAP reais com callbacks controlados. Não houve inspeção visual em navegador, scroll físico em dispositivo ou medição de FPS. A ferramenta `cua_repl.js` continua indisponível; a [skill Sites](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) determina: “If `cua_repl.js` is unavailable, skip browser QA: do not start a preview server, install a browser, or improvise another browser-control path.”

A aparência final dos flashes, sua visibilidade e a comparação com os mockups permanecem para validação visual. Continuam pendentes os assets originais já registrados e os dados comerciais vazios.

O ZIP desta entrega contém fontes, assets, configurações, lockfile, testes e documentação, sem node_modules, dist ou caches. Conforme a preferência do usuário, as próximas etapas também terão ZIP atualizado.

Aguardar autorização para a 6.7 — otimização e correção de sobreposições.
