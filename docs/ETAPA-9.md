# Etapa 9 — Atualizações solicitadas para a landing

## Implementado

- Cards de curso com as imagens fornecidas, na ordem Iniciante e Modelagem, em duas colunas no desktop e empilhados em telas menores.
- Bordas arredondadas, sombra, elevação suave e zoom da imagem no hover, foco e toque; movimento respeita prefers-reduced-motion.
- Os cards navegam para /curso/iniciante e /curso/modelagem, mantendo um único componente de página e um único componente reutilizável de acordeão.
- Cada curso recebe apresentação e módulos do seu próprio JSON. Os quatro módulos provisórios foram preservados em cada arquivo; seus textos podem ser substituídos sem alterar o componente.
- O CTA do Hero aponta para a âncora da seção Curso 3D Flash.
- O menu mantém as quatro âncoras originais: Início, Sobre, Curso e Contato; a opção de Rodapé foi removida.
- A plaquinha QR permanece na seção Curso; a capinha flutuante não foi adicionada à página do curso. As duas capinhas da seção Sobre permanecem.
- A seção Produtos usa o banner Shopee fornecido. O link comercial continua sem destino até que a URL oficial seja configurada.
- O Hero usa pessoa.jpeg; o asset anterior pessoa-original.png permanece preservado e fora da renderização.
- Os quatro assets adicionais estão no manifesto de integridade e são conferidos por scripts/verify-build.mjs.
- Criado workflow de CI para validar formatação, testes, build com base do GitHub Pages e integridade dos assets em pushes/PRs da develop.

## Configurações comerciais ainda vazias

Instagram, WhatsApp, inscrição Hotmart e catálogo Shopee continuam sem URLs porque os destinos oficiais não foram fornecidos. O nome/duração/introdução comerciais do curso também permanecem configuráveis e sem dados inventados.

## Validação

Validação concluída pelo workflow de CI da develop: formatação aprovada, 151 testes aprovados em 19 arquivos, build de produção Angular concluído e verificação SHA-256 dos assets aprovada. O bundle inicial ficou em 241,54 kB (66,28 kB estimados de transferência), com landing lazy de 189,14 kB e curso lazy de 12,80 kB. Não foi executada inspeção visual em navegador.

## Limites conhecidos

O chaveiro e4KC Motorsport permanece bloqueado porque não corresponde ao C4K Marketing do mockup. Os elementos originais não fornecidos (fonte, fundo, divisórias, pedestais e ícones sociais tridimensionais) continuam pendentes. Esta etapa não representa aprovação visual final nem publicação.
