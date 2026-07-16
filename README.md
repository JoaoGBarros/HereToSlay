# Here to Slay

Jogo de cartas multiplayer (baseado no board game "Here to Slay") com frontend desktop em Electron/React e backend em Java organizado como um conjunto de microsserviços que se comunicam **inteiramente através do Kafka**.

O projeto foi feito em duas etapas:

1. **Etapa 1 — Kafka "puro"**: os microsserviços (Gateway, Lobby, Engine) usam `KafkaProducer`/`KafkaConsumer` manualmente para trocar mensagens e persistir estado, rodando sobre um cluster Kafka real de 3 brokers (KRaft, sem Zookeeper).
2. **Etapa 2 — Kafka Streams**: um novo microsserviço (`monitoring`) foi adicionado por cima da infraestrutura já existente, usando a **Streams DSL** e a **Processor API** para detectar padrões nas mensagens que já trafegavam pelo Kafka, sem tocar no fluxo principal do jogo.

---

## Sumário

- [Visão geral da arquitetura](#visão-geral-da-arquitetura)
- [Etapa 1 — Kafka puro (Producer/Consumer)](#etapa-1--kafka-puro-producerconsumer)
- [Etapa 2 — Kafka Streams (serviço de monitoramento)](#etapa-2--kafka-streams-serviço-de-monitoramento)
- [Tópicos Kafka usados no projeto](#tópicos-kafka-usados-no-projeto)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como rodar o projeto](#como-rodar-o-projeto)
- [Como testar o Kafka Streams na prática](#como-testar-o-kafka-streams-na-prática)

---

## Visão geral da arquitetura

```
+--------------------------------------------------------------------------+
|                        Frontend (Electron + React)                       |
+--------------------------------------------------------------------------+
       |  (WebSocket)                      ^  (WebSocket)
       v                                   |
+--------------------------------------------------------------------------+
|                          Nginx (reverse proxy / LB)                      |
+--------------------------------------------------------------------------+
       |                                    ^
       v                                    |
+--------------------------------------------------------------------------------------------------+
|                                   Backend (Java)                                                 |
|  +-----------+   +-----------+   +-----------+   +-----------+   +---------------------------+   |
|  | Gateway x2|   | Lobby  x2 |   | Engine x3 |   |Engine x3..|   |Monitoring (Kafka Streams) |   |
|  +-----------+   +-----------+   +-----------+   +-----------+   +---------------------------+   |
|        ^  |            ^  |            ^  |                              ^         |             |
|        |  v            |  v            |  v                              |         v             |
|  +-----------------------------------------------------------------------------------------+     |
|  |                        Cluster Kafka (3 brokers, KRaft)                                 |     |
|  +-----------------------------------------------------------------------------------------+     |
+--------------------------------------------------------------------------------------------------+
```

- **Frontend**: Electron + React + TypeScript, fala com o backend só via WebSocket.
- **Nginx**: reverse proxy / load balancer na frente das instâncias do **Gateway**.
- **Gateway**: único ponto de contato WebSocket dos clientes. Não tem lógica de jogo — traduz toda mensagem do cliente em uma mensagem Kafka (`lobby-actions-in` ou `game-actions-in`) e consome os tópicos de saída para devolver estado ao jogador certo via WebSocket.
- **Lobby**: gerencia criação/estado das salas antes da partida começar.
- **Engine**: dono da lógica do jogo (turnos, cartas, regras) depois que a partida começa.
- **Monitoring**: microsserviço novo, só de leitura, que roda uma topologia **Kafka Streams** por cima dos tópicos que o Engine já produz/consome, gerando alertas (badges, toasts, histórico de ações) sem interferir na partida.
- **Kafka**: é o **backbone** de tudo — não existe chamada HTTP/RPC direta entre os microsserviços do backend, toda comunicação (inclusive persistência de estado) passa por tópicos.

---

## Etapa 1 — Kafka puro (Producer/Consumer)

Essa foi a primeira parte do trabalho: nenhum microsserviço do backend fala diretamente com outro. Tudo é `KafkaProducer`/`KafkaConsumer` (`org.apache.kafka:kafka-clients`) rodando sobre um **cluster real de 3 brokers** em modo KRaft (sem Zookeeper), definido no `docker-compose.yml`.

### Gateway (`HereToSlay.java`)

- Sobe um `WebSocketServer` (porta `8887`) e, para cada mensagem do cliente:
  - `type: "lobby"` → produz em **`lobby-actions-in`**, usando o `lobbyId` (ou o `playerId`, se ainda não há lobby) como chave de particionamento.
  - `type: "match"` → produz em **`game-actions-in`**, usando o `matchId` como chave.
- Em paralelo, uma thread dedicada roda um `KafkaConsumer` inscrito em `game-state-out`, `lobby-state-out`, `game-monitoring-alerts` e `match-state-store`, e repassa cada mensagem ao(s) jogador(es) certo(s) via WebSocket.
- Como pode haver **múltiplas instâncias de Gateway** (load balanceadas pelo Nginx), cada uma sobe um `group.id` **único** (`heretoslay-gateway-<uuid>`) para o consumer — isso faz cada instância receber *todas* as mensagens dos tópicos de saída (broadcast), não dividir o trabalho, já que qualquer conexão WebSocket pode estar em qualquer instância.
- Mantém um cache local (`matchRosterCache`) da lista de jogadores de cada partida, alimentado pelo tópico `match-state-store` (compactado), para resolver o sentinel `"MATCH_ALL"` usado pelos alertas do monitoring — com fila de retry para alertas que chegam antes do cache estar pronto.

### Lobby (`LobbyApplication` / `LobbyService`)

- Consome `lobby-actions-in`, aplica a ação na entidade `Lobby` em memória e produz o novo estado em `lobby-state-out`.
- Persiste o estado de cada lobby em `lobby-state-store` (tópico compactado, `cleanup.policy=compact`), que funciona como um **event-sourced key-value store**: ao subir, o serviço relê esse tópico do início (`auto.offset.reset=earliest`) para reconstruir o estado em memória, sem precisar de banco de dados externo.

### Engine (`EngineApplication` / `MatchService`)

- Mesmo padrão do Lobby: consome `game-actions-in` (`group.id = heretoslay-engine`), aplica a ação na entidade `Match`, produz o resultado em `game-state-out` e persiste o estado da partida em `match-state-store` (compactado), relido no boot para restaurar partidas em andamento.
- Com **3 réplicas** do Engine no mesmo `group.id`, o Kafka faz o *rebalancing* de partições automaticamente: cada partida (particionada pelo `matchId`) é processada por exatamente uma instância por vez, dando escalabilidade horizontal "de graça".

### Conceitos de Kafka "puro" explorados nessa etapa

- Cluster multi-broker real (3 nós, réplica fator 3, `min.insr=2`) em vez de um broker único de brinquedo.
- Particionamento por chave de negócio (`matchId`/`lobbyId`) para garantir ordenação por partida/lobby.
- `acks=all` no producer para durabilidade.
- Tópicos **compactados** (`match-state-store`, `lobby-state-store`) usados como *changelog*/fonte da verdade para *state recovery* no boot, um padrão de **event sourcing** simples feito só com Kafka.
- Consumer groups com semânticas diferentes: `group.id` fixo e compartilhado (Lobby, Engine) para dividir carga por partição vs. `group.id` único por instância (Gateway) para fazer broadcast.

---

## Etapa 2 — Kafka Streams (serviço de monitoramento)

Documentação técnica completa (álgebra de Allen, tabela de operações da DSL, payloads) em [`docs/kafka-streams.md`](./docs/kafka-streams.md).

Código: `backend/src/main/java/org/br/heretoslay/streams/monitoring/`
Entry point: `GameMonitoringStreamsProcessor` (roda no serviço Docker `monitoring`, via `Dockerfile.monitoring`).

### Ideia central

Um microsserviço **separado** do Engine, construído com `kafka-streams` (Streams DSL + Processor API), que:

- **Lê** os dois tópicos que o Engine já produz/consome — `game-actions-in` (ação bruta do jogador) e `game-state-out` (estado resolvido) — sem nunca escrever de volta neles.
- **Só produz** alertas derivados no tópico `game-monitoring-alerts`.
- É **puramente observacional**: se a topologia tiver um bug, a partida em si não é afetada — o serviço só analisa o que já aconteceu.
- O **Gateway** consome `game-monitoring-alerts` e distribui os alertas via WebSocket (toasts e badges no frontend).

### Detalhes técnicos da topologia

- **State stores in-memory** (`StreamsConfig.DEFAULT_DSL_STORE_CONFIG = IN_MEMORY`), não RocksDB. A tolerância a falha vem do *changelog topic* que o próprio Kafka Streams mantém por trás de cada store.
- Mistura **Streams DSL** (`filter`, `map`, `flatMap`, `groupByKey().windowedBy(...).count()`) com **Processor API** explícita (`.process(...)` + `StoreBuilder` registrado manualmente) quando a lógica precisa de estado mais rico que uma simples contagem em janela.
- Usa **janelas de tempo** (`TimeWindows`, deslizantes e tumbling, de 6s a 2min) para detectar padrões de "rajada" (várias ações em pouco tempo).
- Usa **álgebra de intervalos de Allen** (as 13 relações clássicas: `BEFORE`, `MEETS`, `OVERLAPS`, `DURING`, etc.) para comparar sequências de sorte/azar (`streaks`) de dois jogadores e detectar reviravoltas — o único ponto do serviço que precisa de uma noção de tempo mais rica que "buckets fixos".

### As 10 situações detectadas

| # | Situação | Stateless/Statefull | Mecanismo |
|---|---|---|---|
| 1 | Histórico de ações (últimas 25 da partida) | Statefull (Processor API) | `ActionHistoryProcessor` |
| 2 | Foco de ataque (2+ jogadores no mesmo alvo) | Statefull (DSL) | `groupByKey` + janela deslizante 30s |
| 3 | Reviravolta de sorte (Luck Streak) | Statefull (Processor API + Allen) | `LuckStreakProcessor` |
| 4 | Efeito em cadeia (3+ ações em sequência) | Statefull (DSL) | janela tumbling 35s |
| 5 | Frequent Buyer (6 `draw_card` seguidos) | Statefull (Processor API) | `FrequentBuyerProcessor` |
| 6 | Focusing / Focused (mesmo atacante, mesmo alvo, 3+ vezes) | Statefull (DSL) | janela tumbling 2min + `flatMap` |
| 7 | RNG Diff (3 ataques sem matar o monstro) | Statefull (Processor API) | `RngDiffProcessor` |
| 8 | First Blood (primeiro monstro abatido) | Statefull (Processor API) | `FirstBloodProcessor` |
| 9 | Combo (3 ações em rajada do mesmo jogador) | Statefull (DSL) | janela tumbling 6s |
| 10 | Generous Soul (Modifier positivo em roll de outro jogador) | **Stateless** | `filter` + `map` |

### Por que o `monitoring` roda numa imagem diferente dos outros serviços

`Dockerfile.monitoring` usa `eclipse-temurin:21-jre-jammy` (glibc), enquanto os demais serviços usam `-alpine` (musl) — porque a lib nativa do RocksDB usada por trás do Kafka Streams precisa de glibc para carregar corretamente.

---

## Tópicos Kafka usados no projeto

| Tópico | Produtor | Consumidor(es) | Papel |
|---|---|---|---|
| `lobby-actions-in` | Gateway | Lobby | Ações brutas do jogador na sala |
| `lobby-state-out` | Lobby | Gateway | Estado do lobby para fan-out via WebSocket |
| `lobby-state-store` (compactado) | Lobby | Lobby (no boot) | Persistência/recuperação de estado do lobby |
| `game-actions-in` | Gateway | Engine, Monitoring | Ações brutas do jogador na partida |
| `game-state-out` | Engine | Gateway, Monitoring | Estado/eventos resolvidos da partida |
| `match-state-store` (compactado) | Engine | Engine (no boot), Gateway (cache de roster) | Persistência/recuperação de estado da partida |
| `game-monitoring-alerts` | Monitoring | Gateway | Alertas derivados (badges, toasts, histórico) |

---

## Estrutura do repositório

```
HereToSlay-main/
├── backend/                       # Java 21 + Maven
│   ├── Dockerfile.gateway
│   ├── Dockerfile.lobby
│   ├── Dockerfile.engine
│   ├── Dockerfile.monitoring       # imagem glibc (RocksDB)
│   └── src/main/java/org/br/heretoslay/
│       ├── HereToSlay.java         # Gateway (WebSocket <-> Kafka)
│       ├── lobby/                  # LobbyApplication / LobbyService
│       ├── match/                  # EngineApplication / MatchService
│       ├── streams/monitoring/     # Kafka Streams: topologia + processors
│       ├── entity/                 # Match, Lobby, Player, Card, efeitos de carta...
│       └── auth/                   # autenticação simples de jogador/conexão
├── src/                            # Frontend Electron + React + TS
├── nginx/nginx.conf                # LB de WebSocket na frente do Gateway
├── docker-compose.yml              # Cluster Kafka (3 brokers) + todos os serviços
├── docs/kafka-streams.md           # Documentação detalhada do serviço de monitoring
└── README.md
```

---

## Como rodar o projeto

### Pré-requisitos

- Docker e Docker Compose
- Node.js + npm (para o frontend)
- Java 21 e Maven (opcional — o build do backend já roda dentro dos Dockerfiles)

### 1. Subir o backend (Kafka + microsserviços)

```bash
cd backend
docker compose -f ../docker-compose.yml up --build
```

Isso sobe, na ordem certa (via `depends_on`):

1. **3 brokers Kafka** (`kafka-broker-1/2/3`, modo KRaft, réplica fator 3) nas portas `9092`, `9093`, `9094`.
2. **`kafka-init`**: container que roda uma vez só para criar todos os tópicos (`lobby-actions-in`, `lobby-state-out`, `game-actions-in`, `game-state-out`, `game-monitoring-alerts`, e os compactados `lobby-state-store`/`match-state-store`) com 3 partições e réplica fator 3.
3. **`kafka-ui`** (Provectus Kafka UI) em [http://localhost:8080](http://localhost:8080) — dá para inspecionar tópicos, mensagens e consumer groups em tempo real.
4. **`gateway`** (2 réplicas), **`lobby`** (2 réplicas), **`game-engine`** (3 réplicas) e **`monitoring`** (1 réplica).
5. **`nginx-lb`** na porta `8889`, fazendo load balancing de WebSocket entre as réplicas do Gateway.

> O frontend deve se conectar em `ws://localhost:8889` (via Nginx), não direto numa instância do Gateway.

### 2. Subir o frontend

```bash
# na raiz do projeto
npm install
npm run dev
```

Isso sobe o Vite (React) e o Electron em paralelo, com hot-reload.

### 3. Acompanhando o Kafka

- **Kafka UI**: [http://localhost:8080](http://localhost:8080) — veja os tópicos listados acima, quantas partições/réplicas cada um tem, e as mensagens chegando em tempo real conforme você joga.
- Para inspecionar via CLI dentro de um dos containers dos brokers:
  ```bash
  docker exec -it kafka-broker-1 kafka-console-consumer.sh \
    --bootstrap-server kafka-broker-1:29092 \
    --topic game-monitoring-alerts \
    --from-beginning \
    --property print.key=true
  ```

---

## Como testar o Kafka Streams na prática

Com o ambiente de pé (passo anterior), abra uma partida com pelo menos 2 jogadores e tente disparar as situações mais fáceis de reproduzir manualmente:

- **First Blood** : ataque e derrote qualquer monstro — dispara uma vez só, na primeira morte da partida.
- **Combo** : faça 3 ações quaisquer (ex.: `draw_card` 3x) em menos de 6 segundos.
- **Generous Soul** : jogue uma carta Modifier com valor positivo mirando o roll de **outro** jogador (não o seu).
- **Frequent Buyer** : compre carta (`draw_card`) 6 vezes seguidas sem fazer mais nada no meio.
- **Foco de ataque** : peça para 2 jogadores atacarem o mesmo alvo dentro de 30 segundos.

Todo alerta gerado passa por `game-monitoring-alerts` → Gateway → WebSocket → toast (e, quando aplicável, badge temporária de 20s) na tela do jogo; o histórico de ações aparece num painel colapsável (`📜 History`) em vez de virar toast.

Para observar a topologia isoladamente (sem precisar reproduzir jogadas na UI), é possível escrever mensagens direto nos tópicos de entrada via `kafka-console-producer.sh` e observar `game-monitoring-alerts` no Kafka UI ou via `kafka-console-consumer.sh`.
