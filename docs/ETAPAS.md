# Entregas e validações

## Etapa 1 — Preparação e arquitetura

Implementado:

- Scaffold oficial Angular CLI 22.2.7, Angular 22.2.6, TypeScript 6.0.x e GSAP 3.15.1.
- npm com lockfile para instalações reproduzíveis; SCSS e verificação estrita de tipos/templates.
- Duas rotas standalone com carregamento sob demanda, títulos e fallback.
- Telas técnicas provisórias com navegação entre as rotas.
- Configurações de marca, URLs comerciais vazias, apresentação do curso vazia e catálogo de assets.
- Parâmetros centralizados de animação, sem inicializar efeitos.
- Tokens visuais iniciais com fonte e valores não confirmados identificados como provisórios.
- Estilos globais, foco visível, link de salto ao conteúdo e preferência de movimento reduzido.
- Assets copiados sem modificação, inventário, hashes e referências fora da pasta pública.

Verificações:

- Build de produção: compilação e budgets verificados; saída em `dist/`.
- Quatro testes automatizados: rota inicial; acesso direto ao curso e retorno; fallback; salto ao conteúdo sem abandonar o curso.
- Cópias dos 14 arquivos conferidas por SHA-256.
- Formatação verificada com Prettier.

Limites:

- Testes de rotas executados em JSDOM; acesso direto ao curso em uma hospedagem real ainda não validado.
- Sem teste visual em navegador nesta etapa: a ferramenta de navegador do preview gerenciado não foi disponibilizada.
- A fidelidade visual ainda não é entrega desta etapa; as telas técnicas não reproduzem a landing.
- Assets pendentes estão descritos em `ASSETS.md`.
- Sem deploy, registro de hospedagem ou implementação das próximas etapas.

## Etapa 2 — Landing estática

Estrutura das cinco regiões implementada; CTAs internos, imagens disponíveis e estados sociais sem URL integrados. Build aprovado e seis testes em JSDOM aprovados. A fidelidade visual permanece pendente por falta de assets e de comparação em navegador. Consulte [ETAPA-2.md](ETAPA-2.md) para arquivos, decisões e verificações.

## Etapa 3 — Página do curso

Página funcional com apresentação configurável, quatro acordeões, duas inscrições ligadas ao mesmo destino e retorno ao início. Dados comerciais continuam vazios; botões sem destino ficam desabilitados. Build aprovado e 17 testes em JSDOM aprovados. Consulte [ETAPA-3.md](ETAPA-3.md) para arquivos, decisões e limites de verificação.

## Etapa 4 — Navegação e responsividade

Menu funcional com cascata, âncoras, foco e fechamento por botão/fora/seleção/Escape. Ajustes de robustez responsiva implementados por análise de CSS. Build aprovado e 25 testes JSDOM aprovados. Validação visual em navegador permanece pendente. Consulte [ETAPA-4.md](ETAPA-4.md).

## Etapa 5 — Animações secundárias

Abertura de 0,8s, entradas de 0,4s e transformação da capinha com timeline real de 2s implementadas. Estado compartilhado em memória, movimento reduzido e cleanup. Build aprovado e 36 testes aprovados; callbacks de ScrollTrigger controlados nos testes, sem validação visual. Consulte [ETAPA-5.md](ETAPA-5.md).

## Etapa 6 — Implementação e verificações automatizadas

### Subetapa 6.1 — Posição e flutuação

Posição inicial e flutuação implementadas nos wrappers internos dos cinco assets liberados. Fases e velocidades por ID, visibilidade, movimento reduzido e cleanup. Build aprovado e 41 testes aprovados. Sem inspeção visual em navegador. Consulte [ETAPA-6-1.md](ETAPA-6-1.md).

## Subetapa 6.2 — Geometria responsiva

Percurso em zigue-zague calculado pelas seções e obstáculos, com corredores, déficits de espaço, recálculo e cache de progresso. A ligação ao scroll fica na 6.3. Build aprovado e 58 testes aprovados; geometrias de teste simuladas, sem inspeção visual. Consulte [ETAPA-6-2.md](ETAPA-6-2.md).

## Subetapa 6.3 — Scroll reversível

Condutor conectado ao percurso com timeline GSAP/ScrollTrigger e scrub, avanço/retorno e flutuação independente. Progresso preservado no recálculo e cleanup do scrub anterior. Build aprovado e 71 testes aprovados, incluindo varredura matemática do Hero em cinco larguras; inspeção visual permanece pendente. Consulte [ETAPA-6-3.md](ETAPA-6-3.md).

## Subetapa 6.4 — Movimento em grupo

Cinco chaveiros acompanham o condutor pela mesma polilinha, com atrasos em distância, captura das origens próprias e escala individual. O cache observa todos os integrantes e restaura membros descartados. Um pequeno ajuste inicial do V Motos evita colisão com texto nas larguras intermediárias simuladas. Build aprovado e 81 testes aprovados, incluindo varredura do grupo completo em cinco larguras; validação visual em navegador permanece pendente. Consulte [ETAPA-6-4.md](ETAPA-6-4.md).

## Subetapa 6.5 — Formação horizontal

Os cinco integrantes terminam em uma fileira abaixo dos botões sociais, com flutuação independente. Os atrasos diminuem na chegada e cada peça abre para seu lugar somente no último corredor horizontal. A reserva medida controla contenção e escala; subir desfaz a formação. Build aprovado e 97 testes aprovados, incluindo limites finais em cinco larguras; inspeção visual em navegador permanece pendente. Consulte [ETAPA-6-5.md](ETAPA-6-5.md).

## Subetapa 6.6 — Rastro elétrico

Descargas angulares amarelas com ramificações, pool SVG de oito segmentos, máscara de proteção e fade curto. Telemetria real dos objetos, emissão condicionada ao scroll nativo, movimento reduzido e cleanup. Build aprovado e 118 testes aprovados; inspeção visual permanece pendente. ZIP atualizado entregue ao final da etapa. Consulte [ETAPA-6-6.md](ETAPA-6-6.md).

## Subetapa 6.7 — Otimização e sobreposições

Máscara SVG limitada às descargas ativas, liberada após o fade, e correção da emissão em scroll muito lento. Varredura ampliada para 14 larguras e regressões de redimensionamento, cores forçadas, visibilidade e ciclos de montagem/limpeza. Build aprovado e 133 testes aprovados; inspeção visual e medição de desempenho em dispositivos permanecem pendentes. ZIP atualizado entregue. Consulte [ETAPA-6-7.md](ETAPA-6-7.md).

## Etapa 7 — Verificações automatizadas e limites de validação

Integração entre viagem, flutuação e raios; estados acessíveis das páginas; navegação repetida e entradas secundárias verificadas. Build e 149 testes aprovados em dezenove arquivos. Os 14 originais foram conferidos por SHA-256 e as 12 referências do catálogo existem. A inspeção visual, a avaliação em dispositivos e a medição de desempenho continuam pendentes; não se declara aprovação integral dos critérios de aceitação. ZIP atualizado entregue. Consulte [ETAPA-7.md](ETAPA-7.md).

## Etapa 8 — Preparação técnica para revisão final

Guia de publicação/manutenção e verificador estático do build adicionados. Fontes e compilado entregues em ZIPs separados com hashes. Assets bloqueados e configurações comerciais vazias preservados. Não houve deploy; aprovação visual e publicação definitiva continuam pendentes. Consulte [ETAPA-8.md](ETAPA-8.md) e [PRODUCAO.md](PRODUCAO.md).

## Pendências de fechamento

Assets definitivos, dados comerciais, comparação em navegador, acessibilidade/desempenho em dispositivos e validação da hospedagem. A entrega técnica não substitui essas aprovações.

Após cada etapa: informar arquivos e decisões, executar verificações disponíveis, registrar limitações, entregar um ZIP atualizado com código/assets/documentação e aguardar a autorização solicitada pelo usuário antes de continuar. Excluir dependências instaladas e caches do ZIP; manter os arquivos de configuração e lockfile.
