# Serviço de Monitoramento (Kafka Streams / CEP) — Here To Slay

Código: `backend/src/main/java/org/br/heretoslay/streams/monitoring/`
Entry point: `GameMonitoringStreamsProcessor` (roda como o serviço Docker `monitoring`, `Dockerfile.monitoring`).

## Arquitetura

Um microserviço **separado** do `game-engine`, que:

- **Lê** dois tópicos que o `game-engine` já produz: `game-actions-in` (toda ação bruta que um jogador manda, carimbada com `playerId` pelo Gateway) e `game-state-out` (todo estado/evento que o servidor resolve e devolve aos clientes).
- **Nunca escreve** de volta nesses tópicos — só produz alertas derivados em `game-monitoring-alerts`.
- É puramente observacional: se a topologia quebrar ou tiver um bug, a partida em si continua funcionando normalmente. Ele só analisa o que já aconteceu.
- O **Gateway** (`HereToSlay.java`) consome `game-monitoring-alerts` e distribui via WebSocket para os jogadores da partida certa (resolve o sentinel `"MATCH_ALL"` usando um cache de roster por partida, com fila de retry para alertas que chegam antes do cache estar pronto).

Todos os state stores são **in-memory** (`StreamsConfig.DEFAULT_DSL_STORE_CONFIG = IN_MEMORY`), não RocksDB — a imagem `jre-alpine` (musl) não consegue carregar a lib nativa do RocksDB (linkada contra glibc). Para um serviço de alerta isso é suficiente: o changelog topic que o Kafka Streams mantém por trás de cada state store já garante tolerância a falha.

## Álgebra de Allen

Usada na **Situação 3 (Reviravolta de Sorte / Luck Streak)** para classificar como as sequências de sorte ("streaks") de dois jogadores se relacionam no tempo.

- `StreakInterval` (`StreakInterval.java`) representa a sequência atual de um jogador como um intervalo `[start, end)` do tipo `HOT` (rolls de sucesso) ou `COLD` (rolls de falha). Cada `process_hero_roll` estende o intervalo aberto atual ou fecha o anterior e abre um novo, se o tipo mudou.
- `AllenRelation` (`AllenRelation.java`) implementa as **13 relações clássicas** da álgebra de Allen (`BEFORE`, `MEETS`, `OVERLAPS`, `STARTS`, `DURING`, `FINISHES`, `EQUALS`, `AFTER`, `MET_BY`, `OVERLAPPED_BY`, `STARTED_BY`, `CONTAINS`, `FINISHED_BY`), comparando os pares `(start, end)` de dois intervalos.
- Quando o streak de um jogador **fecha** (a sorte dele virou), o `LuckStreakProcessor` classifica a relação de Allen entre o intervalo que acabou de fechar e o intervalo **ainda aberto** de todo rival na mesma partida. Só relações "interessantes" (`isNoteworthy()` — tudo exceto `BEFORE`/`AFTER`/`MEETS`/`MET_BY`, ou seja, os intervalos genuinamente se sobrepõem/contêm um ao outro no tempo) disparam o alerta `TURNING_POINT`.

Esse é o único ponto do serviço que usa álgebra de intervalos explicitamente — as demais situações usam janelas temporais nativas do Kafka Streams (`TimeWindows`/contagens), que são uma noção de tempo mais simples (buckets fixos), não uma comparação par-a-par de intervalos.

## Inventário de operações da DSL

| Tipo | Operação | Onde é usada |
|---|---|---|
| Stateless | `filter` | Validação de JSON em `actionsIn`/`statesOut`; todo `filter((key,value) -> ...)` das situações 2, 4, 6, 9, 10 |
| Stateless | `map` / `flatMap` | Reconstrução de chave composta (`matchId\|targetPlayerId`, `matchId\|playerId`) nas situações 2, 6, 9; `flatMap` na situação 6 (gera 2 saídas — Focusing e Focused — a partir de 1 entrada) |
| Stateless | `to(...)` | Envio final para `game-monitoring-alerts` em todas as situações |
| Statefull | `groupByKey().windowedBy(TimeWindows...).count()` | Situações 2, 4, 6, 9 — agregação (contagem) sobre uma janela temporal, backed por state store interno do Streams |
| Statefull | Processor API + state store explícito | Situações 1, 3, 5, 7, 8 (`ActionHistoryProcessor`, `LuckStreakProcessor`, `FrequentBuyerProcessor`, `RngDiffProcessor`, `FirstBloodProcessor`) |
| Join | *(nenhum atualmente)* | A Situação 1 era um `join` stream-stream (`actionsIn.join(statesOut, ..., JoinWindows...)`) até ser substituída pelo histórico de ações (ver "Mudanças recentes" abaixo) |

## As 10 situações detectadas

| # | Situação | Stateless/Statefull | Operação DSL | Janela |
|---|---|---|---|---|
| 1 | **Histórico de ações** — lista rolante das últimas 25 ações da partida | Statefull (Processor API) | `process(ActionHistoryProcessor)` — acumula um array JSON por `matchId` num state store | Nenhuma (lista capada, não janela de tempo) |
| 2 | **Foco de ataque** — 2+ jogadores atacando o mesmo alvo | Statefull (DSL) | `filter` → `map` (chave `matchId\|targetPlayerId`) → `groupByKey` → `count` | `TimeWindows`, 30s, deslizante (`ofSizeAndGrace`, sem grace) |
| 3 | **Reviravolta de sorte** (Luck Streak / Allen) | Statefull (Processor API) | `filter` (`process_hero_roll`) → `process(LuckStreakProcessor)` | Nenhuma — o próprio streak (intervalo) é a "janela" |
| 4 | **Efeito em cadeia** — 3+ ações resolvidas em sequência rápida | Statefull (DSL) | `groupByKey` → `count` | `TimeWindows`, 35s, tumbling |
| 5 | **Frequent Buyer** — 6 `draw_card` seguidos sem outra ação no meio | Statefull (Processor API) | `process(FrequentBuyerProcessor)` — streak por `matchId\|playerId` | Nenhuma — o streak é resetado por qualquer outra ação |
| 6 | **Focusing / Focused** — mesmo atacante mirando o mesmo alvo 3+ vezes | Statefull (DSL) | `filter` → `map` (chave `matchId\|attackerId\|targetId`) → `groupByKey` → `count` → `flatMap` (2 saídas) | `TimeWindows`, 2min, tumbling |
| 7 | **RNG Diff** — 3 ataques a monstro seguidos sem matar | Statefull (Processor API) | `process(RngDiffProcessor)` sobre `game-state-out` — streak por `matchId\|playerId` | Nenhuma |
| 8 | **First Blood** *(novo)* — primeiro monstro abatido na partida | Statefull (Processor API) | `process(FirstBloodProcessor)` sobre `game-state-out` — flag único por `matchId` | Nenhuma (dispara 1x por partida) |
| 9 | **Combo** *(novo)* — mesmo jogador com 3 ações em rajada | Statefull (DSL) | `filter` → `map` (chave `matchId\|playerId`) → `groupByKey` → `count` | `TimeWindows`, 6s, tumbling |
| 10 | **Generous Soul** *(novo)* — Modifier positivo no roll de outro jogador | **Stateless** | `filter` (`play_modifier` + `chosen_value>0` + alvo ≠ autor) → `map` | Nenhuma |

### Situações 8, 9 e 10 são novas — badges fáceis de testar

Foram adicionadas para ter mais 3 "conquistas" fáceis de disparar manualmente, distintas das já existentes (`FREQUENT_BUYER`, `FOCUSING`/`FOCUSED`, `RNG_DIFF`):

- **First Blood**: basta um único ataque bem-sucedido a qualquer monstro na partida.
- **Combo**: mandar 3 ações quaisquer (ex: `draw_card` 3x) em menos de 6 segundos.
- **Generous Soul**: jogar qualquer carta Modifier com valor positivo mirando o roll de **outro** jogador (não o próprio).

Foram escolhidas deliberadamente para cobrir 3 abordagens técnicas diferentes: state store de flag único (First Blood), agregação por janela na DSL com chave por-jogador (Combo) e filtro/map totalmente stateless de evento único (Generous Soul) — complementando as situações já existentes, que já cobriam streak-via-Processor-API e streak-via-janela-com-chave-composta.

## Mudanças recentes

- **Removida**: Situação "Partida travada" (session window de inatividade de 60s) — retirada a pedido, junto com `MonitoringAlert.matchStalled`.
- **Substituída**: a Situação 1 original ("evento composto", um `join` stream-stream entre `game-actions-in` e `game-state-out` numa janela de 2s, que só gerava um toast genérico "Action processed") foi trocada pelo **Histórico de ações** — em vez de só notificar que *uma* ação foi processada, o serviço agora acumula e reenvia a lista das últimas 25 ações da partida inteira, exibida num painel colapsável (`📜 History`) na tela do jogo. Tecnicamente isso trocou um `join` (correlação de dois streams) por uma agregação com state store explícito (`ActionHistoryProcessor`) — mesma categoria "Statefull", mecanismo diferente.
- **Adicionadas**: 3 novos badges (First Blood, Combo, Generous Soul — ver acima).

## Payload dos alertas

Todo alerta (`MonitoringAlert.java`) tem o formato:

```json
{
  "targetPlayers": ["MATCH_ALL"],
  "payload": {
    "type": "monitoring_alert",
    "situation": "FIRST_BLOOD",
    "message": "🩸 First blood! ...",
    "extra": { "taggedPlayerId": "...", "tagType": "FIRST_BLOOD" }
  }
}
```

O frontend (`InGame.tsx`) trata `situation === "ACTION_HISTORY"` como um caso especial — não vira toast, só atualiza o painel de histórico (`extra.history`, o array capado inteiro). Toda outra `situation` vira um toast; se além disso `extra.taggedPlayerId`/`extra.tagType` estiverem presentes, também aparece uma badge temporária (20s) ao lado do avatar do jogador.
