# Publicação e manutenção

## Estado da entrega

O pacote é uma versão para revisão final. Há build estático e verificações automatizadas aprovadas; faltam a aprovação visual em navegador, assets definitivos e dados comerciais. Não houve deploy, registro de Site ou configuração de domínio. Não apresentar o resultado como reprodução visual definitiva dos mockups.

## Pacotes

- **Fontes:** extrair `3d-flash-etapa-8.zip`, entrar em `3d-flash` e usar Node.js 24 e npm 11. Executar `npm ci` e `npm start` para desenvolvimento.
- **Compilado:** `3d-flash-build-etapa-8.zip` contém o conteúdo de `dist/`, com index.html na raiz. Serve para revisão ou hospedagem estática sem instalar Node no servidor. Não inclui fontes, testes, referências visuais ou documentação.
- **Inventário:** `docs/release-manifest.json` lista os caminhos, tamanhos e hashes SHA-256 de todos os arquivos compilados. O arquivo SHA-256 entregue ao lado dos ZIPs identifica os dois pacotes completos.

Não abrir index.html diretamente por file://; Angular precisa ser servido por HTTP(S). O servidor de desenvolvimento é iniciado com `npm start` a partir das fontes. Nenhum servidor foi iniciado no ambiente desta entrega.

## Conferência antes de gerar uma versão

```bash
npm ci
npm run release:check
```

O segundo comando verifica formatação, executa os testes, compila em produção e confere as referências estáticas. O build termina em `dist/`. `npm run verify:build` pode ser usado isoladamente depois de um build existente.

O verificador examina a entrada HTML, JS/CSS, imports dos chunks, presença e integridade dos 12 assets originais de produção e arquivo de licenças. Rejeita referências ausentes, assets alterados, source maps ou pastas de desenvolvimento no resultado. Não é um teste de navegador, hospedagem, tráfego de rede ou URLs comerciais.

Para registrar o inventário sem o texto adicional do npm:

```bash
node scripts/verify-build.mjs > docs/release-manifest.json
```

Gere o inventário após o build final. Um novo build pode alterar hashes e nomes dos bundles; republique o conjunto completo, preservando uma cópia da versão anterior para eventual retorno.

## Contrato da hospedagem

A configuração atual exige servir a aplicação na raiz do domínio (`<base href="/">` e imagens em `/assets/`). Não publicar em subdiretório sem adaptar essas referências e validar novamente as duas rotas.

1. Enviar o **conteúdo** de dist/ para a raiz pública do site, incluindo assets/ e 3rdpartylicenses.txt.
2. Servir JS como JavaScript, CSS como CSS e PNG como imagem. Usar HTTPS no destino definitivo.
3. Devolver index.html para navegações SPA, incluindo acesso direto e atualização de `/curso`.
4. Recursos estáticos inexistentes precisam retornar 404; não devolver HTML como resposta de um bundle JS/CSS ausente.
5. Revalidar index.html a cada publicação. Bundles com hash podem ter cache prolongado; as imagens têm nomes estáveis e não devem receber cache imutável sem versionamento.
6. Abrir `/`, `/curso` diretamente e uma rota inexistente após publicar. Conferir console, rede, links e scroll nos dois sentidos no servidor real.

Exemplo de regras para Nginx, dentro do server correspondente (ajustar root ao local real dos arquivos):

```nginx
root /var/www/3d-flash;
index index.html;

location = /index.html {
    add_header Cache-Control "no-cache";
}

location ~* \.(?:js|css|png|svg|webp|woff2?|txt)$ {
    try_files $uri =404;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

Esse exemplo foi revisado como texto, não executado em um servidor. Outros provedores precisam configurar seu equivalente de fallback SPA. A hospedagem definitiva ainda não foi selecionada.

## Configurações que ainda precisam de valores

| Informação                                             | Arquivo                                       |
| ------------------------------------------------------ | --------------------------------------------- |
| Instagram, WhatsApp, inscrição e apresentação do curso | `src/app/core/config/site.config.ts`          |
| Módulos e descrições definitivos                       | `src/app/features/course/data/course.data.ts` |
| Assets liberados ou bloqueados                         | `src/app/core/config/assets.config.ts`        |
| Fonte e tokens visuais                                 | `src/styles/_tokens.scss`                     |
| Intensidade e duração das animações                    | `src/app/core/config/animation.config.ts`     |

Manter URLs vazias enquanto não existirem destinos reais. Os dois CTAs da landing navegam para `/curso`; as duas inscrições usam a mesma configuração. A inscrição exige HTTPS. Não colocar segredos no frontend ou nesse arquivo de configuração: tudo que entra no build pode ser lido pelo visitante.

Ao receber a pessoa transparente ou o sexto chaveiro correto, atualizar o catálogo e seus limites visíveis. Conferir origem, proporção, transparência e corredores antes de liberar renderAllowed. Não remover o bloqueio dos arquivos atuais apenas para preencher o espaço.

## Pendências antes da aprovação definitiva

- Pessoa com transparência real e chaveiro C4K Marketing correspondente à referência.
- Fonte, fundos/divisórias/pedestais e ícones sociais originais ou definição aprovada para esses elementos.
- URLs reais, apresentação do curso e revisão dos módulos provisórios.
- Comparação visual desktop/mobile; inspeção em tablets, zoom, teclado, movimento reduzido e tecnologias assistivas.
- Validação do rastro, transformações e desempenho em dispositivos reais.
- Escolha da hospedagem e validação do fallback, MIME e cache no servidor.

O checklist visual detalhado está em ETAPA-7.md. Essas pendências não foram substituídas por aprovação automática.
