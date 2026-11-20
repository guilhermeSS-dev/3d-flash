# Experiência de lançamento

A tela de lançamento foi migrada da V7, mantendo os templates, estilos, imagens, produtos,
cursos e navegação por hash da landing atual. A landing continua montada atrás da camada;
suas animações de entrada e dos chaveiros aguardam a revelação.

## Ativar e configurar

Em `src/app/core/config/launch-schedule.json`:

- `enabled`: `true` ativa a experiência; `false` mantém acesso direto à landing.
- `launchAt`: instante ISO 8601 com offset explícito, por exemplo
  `2030-12-01T20:00:00-03:00`.
- `timeZone`: fuso IANA para apresentação, por exemplo `America/Sao_Paulo`.

A data é ilustrativa e a experiência vem desativada, pois o lançamento oficial ainda
não foi definido. Depois do instante configurado, o acesso é direto à landing.

Em `src/app/core/config/launch.config.ts`:

- `VIP_REWARD_THRESHOLD`: raios por partida para iniciar o easter egg.
- `VIP_WHATSAPP_URL`: convite HTTPS do grupo. Enquanto vazio, o botão não navega.
- `game`: física, progressão, limites, obstáculos e colisões.
- `spriteAnimation`: multiplicadores dos três sprites. A animação do personagem
  acompanha a distância percorrida, acelerando junto com o cenário.
- `audio`: música arcade sintetizada, coleta, colisão e volumes.
- `reveal`: antecipação, duração, tamanho dos pixels e camadas da transição.
- `timeSource`: endpoint e limites de sincronização.

## Horário sem servidor próprio

A referência padrão é a API pública TimeAPI.io:
`https://timeapi.io/api/time/current/zone?timeZone=Etc%2FUTC`.
Ela fornece os campos de calendário em UTC e permite CORS. O instante retornado é
ancorado em `performance.now()`; alterações posteriores no relógio do aparelho não
alteram essa referência. O fuso do lançamento é independente do fuso do visitante.

Erro de rede, HTTP, resposta inválida ou timeout de 5 segundos ativa o fallback
solicitado: `Date.now()`, também com âncora monotônica. Novas consultas periódicas
permitem retornar à API. No fallback, o relógio do dispositivo é a referência;
o mecanismo não é uma barreira de segurança contra manipulação pelo visitante.

Não há servidor Node, proxy, endpoint próprio ou serviço de horário a iniciar.
Continuam válidos os comandos existentes:

```sh
npm ci
npm start
# Para testar no celular, na mesma rede:
npm run dev
```

No celular, abra `http://IP_DO_COMPUTADOR:4200`; mantenha o terminal aberto e permita
acesso à porta no firewall, se necessário.

## Organização

`src/app/features/launch/` contém contador, camada, jogo Canvas 2D, motor de física,
entrada, áudio, estado persistente, easter egg, modal e transição SVG.
`launch-session.service.ts` controla a revelação e as inicializações adiadas.
A configuração é importada no bootstrap somente para decidir a janela de lançamento.
O jogo e sua interface ficam no chunk lazy da home.

Os GIFs originais estão em `public/assets/launch/originals/`. Os atlas PNG preservam
os nove frames e transparência de cada GIF e permitem controlar a velocidade no Canvas.
`runner-assets.generated.json` registra dimensões, duração e âncoras. Para regenerar
opcionalmente, use `python scripts/prepare-runner-atlases.py` com Pillow instalado.
Isso não é necessário para executar ou compilar o projeto.
As fontes Bungee e Silkscreen são locais, com suas licenças em `public/assets/fonts/`.
O logo é o asset já existente da landing; ele não foi substituído.

O recorde, desbloqueio e anúncio VIP usam estados separados em localStorage,
chave `3d-flash.launch.v1`. Falhas de armazenamento não interrompem o jogo.
Espaço, seta para cima ou Tab iniciam/pulam/reiniciam; Shift+Tab navega pelos controles.
Em touch, tocar fora dos controles interage com o jogo. O modal pausa a partida,
fecha pelo X, Escape ou clique fora e libera o botão persistente abaixo do jogo.
Som só inicia após interação. Aba oculta pausa a simulação e suspende áudio.
A revelação libera os recursos e restaura a interação com a mesma landing.

## Verificações

```sh
npm run format:check
npm run test:ci
npm run build -- --base-href /3d-flash/
npm run verify:build
```

O base href é o mesmo esperado pelo workflow atual do GitHub Pages.
URLs dos novos assets respeitam esse subdiretório; as fontes são processadas pelo build.
Os testes automatizados cobrem física, geração, progressão, sprites, input,
recompensa, áudio, ciclo de vida, transição, fallback e integração com a home atual.
Validação visual real em Safari/iPhone e outros navegadores continua recomendada;
os testes DOM não substituem testes de dispositivo.
