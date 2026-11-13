# Etapa 7 — Verificação integrada da aplicação

## Resultado e escopo

Esta entrega amplia a verificação automatizada da aplicação. Não altera o comportamento de produção, os assets ou os dados comerciais. A validação visual em navegadores e dispositivos permanece pendente; a aplicação não é declarada integralmente aprovada pelos critérios finais de aceitação.

## Testes novos

### Pipeline de animação

Cinco testes em `home-animation.integration.spec.ts` conectam flutuação, viagem e rastro elétrico pelo mesmo fluxo de callbacks. Utilizam GSAP real e uma geometria numérica coerente; a criação do ScrollTrigger é controlada.

Cobrem viagem/retorno até a fileira, flutuação independente durante a parada, desaparecimento das descargas, atualização de máscaras e posições no redimensionamento, movimento reduzido, documento oculto e destruição conjunta dos recursos. A verificação de limpeza procura tweens próprios na timeline global, triggers e nós SVG remanescentes.

### Estrutura da aplicação

Cinco testes em `app.validation.spec.ts` renderizam as rotas Angular reais em JSDOM e verificam:

- Um único h1 por página, IDs únicos e referências aria resolvíveis.
- Controles com nome, imagens com alt e dimensões declaradas, proteção de links externos quando presentes.
- Quatro seções da landing e o rodapé, sem formulário ou regiões extras.
- Chaveiros e SVG elétrico decorativos, sem controles focáveis.
- Três ciclos de navegação ao curso e retorno sem menus, overlays ou títulos duplicados.
- Relações e estados dos quatro acordeões nas páginas montadas.

Essas verificações não equivalem a uma auditoria com leitor de tela ou de contraste.

### Animações secundárias

Seis testes em `home-entrance.animations.spec.ts` verificam abertura de 0,8 s, revelações de 0,4 s, execução única, conclusão da animação ao receber foco, preservação do estado entre montagens, movimento reduzido e conteúdo inicialmente visível ou restaurado. O cleanup remove os tweens próprios.

## Matriz de verificação

| Área           | Evidência automatizada                                                              | Verificação ainda pendente                           |
| -------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Rotas e CTAs   | Angular Router em JSDOM; dois CTAs para /curso e retorno                            | Acesso direto na hospedagem final                    |
| Menu           | Estados, fechamento, Escape, foco e âncoras nos testes existentes                   | Cascata visual e interação física em desktop e touch |
| Curso          | Quatro acordeões, estados, navegação de foco e inscrições com destino compartilhado | Dados e URL comercial definitivos                    |
| Capinha        | Timeline real de 2 s, início para baixo e sessão única                              | Aparência real da transformação                      |
| Chaveiros      | Pipeline integrado, ida/volta, parada, formação e flutuação                         | Comparação visual e scroll em dispositivo            |
| Responsividade | Varredura geométrica em 14 larguras de 320 a 2560 px                                | CSS renderizado, tablets, zoom e diferentes fontes   |
| Raios          | Direção, pool, parada/fade, máscara, resize, visibilidade e limpeza                 | Aparência, intensidade e visibilidade reais          |
| Acessibilidade | Estrutura, nomes, relações aria, foco e movimento reduzido                          | Contraste, leitor de tela e teclado em navegador     |
| Desempenho     | Budgets do build, pool limitado, ausência de leitura de layout nos frames testados  | FPS, memória, GPU, rede e Lighthouse em dispositivos |
| Assets         | SHA-256 dos 14 originais/cópias; 12 referências do catálogo existentes              | Assets faltantes e aprovação visual                  |

Os links Instagram, WhatsApp e inscrição continuam vazios, com os respectivos estados indisponíveis. Não há destino comercial real a acessar ou validar. Não foram inventados URLs ou informações do curso.

## Verificações executadas

- 149 testes aprovados em dezenove arquivos, incluindo os dezesseis testes novos desta entrega.
- Build de produção aprovado sem avisos de budget: 240,32 kB iniciais (estimativa de transferência 66,12 kB), landing lazy de 185,00 kB e curso lazy de 11,48 kB.
- Artefatos de produção idênticos aos da 6.7: as alterações desta entrega são testes e documentação.
- Formatação verificada com Prettier.
- Rotas, menus, links internos, acordeões, sessão de animação, capinha, flutuação, geometria, formação e raios continuam aprovados nos ambientes de teste descritos.

Além dos testes, foi executada uma conferência por SHA-256 contra os 14 originais e os hashes do inventário. Todos coincidem. As 12 referências de imagem do catálogo existem em public/assets. Os mockups e a documentação permanecem fora do build público.

As imagens originais de produção ocupam aproximadamente 16 MB em disco. O tamanho do JavaScript não representa o custo total das imagens no carregamento; a experiência real de rede ainda não foi medida. Não foram geradas ou comprimidas novas versões dos produtos nesta etapa.

## Inspeção visual pendente

A descoberta de ferramentas e a busca no ambiente continuaram sem disponibilizar `cua_repl.js`. A [skill Sites](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) determina: “If `cua_repl.js` is unavailable, skip browser QA: do not start a preview server, install a browser, or improvise another browser-control path.” Não foi iniciado um servidor paralelo, instalado um navegador ou executado outro meio de controle como alternativa.

Quando a inspeção visual estiver disponível, verificar:

- Desktop, tablets e celulares, incluindo os dois lados dos breakpoints e zoom de 200%.
- Percurso completo descendo/subindo, scroll rápido e lento, paradas e redimensionamentos intermediários.
- Ausência de cobertura dos textos e botões, mantendo menu acima de objetos e efeitos.
- Fileira final abaixo dos sociais, com flutuação após a parada e desfazimento na subida.
- Raios amarelos angulares, fade rápido, proteção dos conteúdos e aparência diferente de fumaça/cometa.
- Transformação com os dois assets carregados, sem repetir ao retornar do curso.
- Foco, teclado, movimento reduzido e mudança dessa preferência durante o uso.
- Rede móvel, memória e FPS antes de qualquer afirmação de desempenho em dispositivo.

## Arquivos e entrega

Criados os três arquivos de testes descritos acima e este relatório. Atualizados README e acompanhamento. Nenhuma dependência adicionada, nenhuma informação comercial alterada e nenhuma publicação realizada.

O ZIP da Etapa 7 inclui código, imagens, testes, configurações, lockfile e documentação. Dependências instaladas, caches e saída de build ficam fora do pacote.

Continuam pendentes a pessoa com transparência real, o sexto chaveiro correto, a fonte e os elementos decorativos originais registrados em ASSETS.md. Aguardar autorização para a Etapa 8 — revisão e preparação da produção, preservando esses limites.
