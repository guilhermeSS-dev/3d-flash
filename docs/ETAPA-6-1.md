# Subetapa 6.1 — Posição inicial e flutuação

## Entrega

Cinco chaveiros com assets liberados flutuam no Hero. O sexto slot continua reservado, sem imagem ou animação, pela divergência entre o asset fornecido e o mockup.

Cada objeto tem deslocamento vertical, rotação, duração e fase próprios. A variação é determinística pelo ID do asset: remover ou reordenar outro chaveiro não altera o movimento dos restantes. Não é uma trajetória vertical da página; trata-se apenas da oscilação local da subetapa 6.1.

Os wrappers externos `data-keychain-path` continuam livres para a trajetória futura. GSAP modifica somente `y` e `rotation` nos wrappers internos `data-keychain-float`. As imagens e suas compensações de margens transparentes não são animadas diretamente.

## Parâmetros

Centralizados em `core/config/animation.config.ts`:

- Deslocamento máximo: 5 px em cada direção.
- Rotação adicional máxima: 2 graus em cada direção.
- Meio ciclo entre 2,7 e 3,9 s; ciclo completo entre 5,4 e 7,8 s.
- `repeat: -1`, `yoyo: true` e `sine.inOut`.

Os valores são ajustes iniciais e ainda precisam de comparação visual. A rotação estática original dos wrappers externos é preservada.

## Visibilidade e movimento reduzido

A animação continua quando o usuário para de rolar. No Hero visível, não depende de eventos de scroll.

Fora da área visível ou com o documento em segundo plano, os tweens são pausados. Ao retornar, retomam o mesmo `totalTime`, sem reiniciar o ciclo. Isso reduz trabalho em áreas não vistas.

`prefers-reduced-motion` mantém os objetos estáticos, inclusive quando a preferência muda durante a sessão. Observers, listener de visibilidade e tweens são removidos ao destruir o componente ou trocar a condição de mídia. O cleanup é idempotente e restaura apenas os estilos controlados pela flutuação.

O helper aceita `visibilityTarget` opcional. Por enquanto observa o host dentro do Hero; na subetapa 6.2, o alvo precisará cobrir a área real do percurso para que a flutuação continue ao viajar para outras seções.

## Ajustes da posição inicial

A revisão matemática de bounds e pixels alpha, sem navegador, apontou pouca folga no mobile:

- Removida a margem negativa antes do texto do Hero. A estimativa de folga no menor viewport passou de uma possível interseção para aproximadamente 8 px.
- Mínimo do logo mobile passou de 10rem para 7rem, mantendo 35vw como dimensão fluida, mais próximo da proporção do mockup e evitando a colisão simulada com o anel de Rô Cabelos em 320 px.
- A cena mobile ganhou mínimo de 15rem para acomodar o grupo com texto ampliado. Nas larguras normais auditadas, o aspect ratio já produz altura maior que esse mínimo.

Nenhuma imagem foi recortada ou alterada. A pessoa continua sem renderização até receber transparência real.

## Arquivos

Criados:

- `src/app/features/home/animations/keychain-float.animations.ts`
- `src/app/features/home/animations/keychain-float.animations.spec.ts`

Atualizados:

- `FloatingKeychains`: inicialização após render e fora da zona Angular; cleanup no destroy; identificação dos dois níveis de wrappers.
- `animation.config.ts`: velocidades de oscilação centralizadas.
- `hero-section.scss`: folgas iniciais mobile.
- README e acompanhamento.

Nenhuma dependência adicionada e nenhuma publicação realizada.

## Verificações

- Build de produção aprovado sem warnings de budget.
- 41 testes aprovados em oito arquivos.
- Cinco testes de flutuação com GSAP real: repetição/yoyo e amostragem do ciclo; limites de deslocamento/rotação; identidade de fase independente da lista; pausa/resumo por visibilidade; movimento reduzido em mudança de mídia; cleanup e preservação dos transforms externos/das imagens.
- Observers, visibilidade e preferências de mídia são simulados nesses testes.
- Formatação aprovada e revisão de código sem defeitos concretos adicionais encontrados.

Não houve screenshot, teste visual em viewport real, medição de FPS, avaliação real de sobreposições ou ajuste da sensação de movimento em navegador. As estimativas de posição são simulações, não renderizações do site.

A ferramenta `cua_repl.js` continua indisponível. A skill [Sites](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) determina “If `cua_repl.js` is unavailable, skip browser QA”; a limitação visual permanece registrada.

## Continuação

A Etapa 6 ainda não está concluída. Próxima subetapa: 6.2, trajetória responsiva em zigue-zague, seguida por sincronização reversível, grupo e formação final. O rastro elétrico só deverá ser implementado depois de validar a trajetória principal.
