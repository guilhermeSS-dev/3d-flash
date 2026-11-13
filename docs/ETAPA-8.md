# Etapa 8 — Revisão e preparação da produção

## Entrega

Preparado um pacote de fontes e um pacote estático compilado para revisão final. O fluxo de validação e as instruções de publicação/manutenção estão documentados em PRODUCAO.md. Não houve registro de hospedagem, deploy ou definição de domínio.

A interface de produção permanece igual à da Etapa 7. Não foram preenchidos dados comerciais ou liberados assets bloqueados. A revisão visual definitiva continua pendente; esta entrega não representa aprovação integral dos critérios de aceitação.

## Revisão técnica

- Saída Angular estática em dist/, com bundles versionados por hash e páginas carregadas sob demanda.
- Base URL na raiz, idioma pt-BR, título e descrição da marca, sem endereço comercial inventado.
- Rotas `/` e `/curso`, CTAs internos e configuração compartilhada de inscrição preservados.
- Arquivos de fonte, testes e mockups fora do resultado público.
- Arquivo de licenças incluído no compilado.
- Requisitos de fallback SPA, MIME, cache e acesso direto documentados; o servidor final ainda não foi testado.

## Ferramentas de entrega

Criado `scripts/verify-build.mjs`, usando apenas APIs nativas do Node. Confere referências HTML e de chunks, a integridade dos 12 assets de produção e a ausência de arquivos de desenvolvimento/source maps no build.

Adicionados comandos em package.json:

- `verify:build`: auditoria estática do build existente.
- `release:check`: formatação, testes, build de produção e auditoria dos artefatos.

O arquivo `docs/release-manifest.json` contém o inventário e SHA-256 do build entregue. Não é um atestado visual, de hospedagem ou de qualidade comercial.

## Arquivos criados ou alterados

- `scripts/verify-build.mjs`: conferência dos artefatos.
- `package.json`: comandos de conferência e inclusão de scripts na formatação.
- `docs/PRODUCAO.md`: execução, configuração, manutenção e publicação.
- `docs/release-manifest.json`: inventário do build.
- Este relatório, README e acompanhamento das etapas.

Nenhuma dependência ou imagem alterada; lockfile preservado.

## Verificações

- `npm run release:check` executado com sucesso: formatação, 149 testes em dezenove arquivos, build e verificação estática.
- Build de produção aprovado sem avisos de budget: 240,32 kB iniciais, landing lazy de 185,00 kB e curso lazy de 11,48 kB.
- Entrada HTML e seus bundles presentes; quatro referências de chunks verificadas.
- Doze assets de produção com SHA-256 igual ao inventário original.
- Dezenove arquivos compilados inventariados, incluindo licenças; sem fontes, testes, mockups ou source maps no build.
- Node.js 24.22.1 e npm 11.9.0 utilizados.
- Formatação final da documentação e do inventário conferida com Prettier.
- Pacotes ZIP conferidos por integridade; o conteúdo do ZIP compilado é comparado aos hashes do inventário.
- Nenhum teste de hospedagem ou navegação física em navegador foi executado.

## Limites

Não foi possível comparar a renderização com os mockups ou medir FPS, GPU, rede e acessibilidade em dispositivos reais. A ferramenta `cua_repl.js` segue indisponível; a [skill Sites](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) determina: “If `cua_repl.js` is unavailable, skip browser QA: do not start a preview server, install a browser, or improvise another browser-control path.”

O pedido original também exige aguardar os assets corretos antes de finalizar as partes visuais correspondentes. A pessoa atual contém xadrez incorporado; o sexto chaveiro difere da referência. Fonte e elementos decorativos originais seguem pendentes. Assim, a preparação técnica está entregue, mas a aprovação visual e comercial e a publicação definitiva permanecem abertas.

## Pacotes

- `3d-flash-etapa-8.zip`: fontes, assets, testes, scripts, configurações, lockfile e documentação.
- `3d-flash-build-etapa-8.zip`: somente o conteúdo compilado de dist/.
- `3d-flash-etapa-8-SHA256.txt`: hashes dos dois ZIPs para conferir a transferência.

Os pacotes não incluem node_modules ou caches. O ZIP compilado é oferecido para revisão/hospedagem estática, sem sugerir que as pendências foram resolvidas.
