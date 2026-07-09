package org.br.heretoslay.streams.monitoring;

import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.KeyValue;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.Topology;
import org.apache.kafka.streams.kstream.Consumed;
import org.apache.kafka.streams.kstream.Grouped;
import org.apache.kafka.streams.kstream.JoinWindows;
import org.apache.kafka.streams.kstream.KStream;
import org.apache.kafka.streams.kstream.SessionWindows;
import org.apache.kafka.streams.kstream.StreamJoined;
import org.apache.kafka.streams.kstream.TimeWindows;
import org.apache.kafka.streams.state.KeyValueStore;
import org.apache.kafka.streams.state.StoreBuilder;
import org.apache.kafka.streams.state.Stores;
import org.json.JSONObject;

import java.time.Duration;
import java.util.Properties;

/**
 * "Um sistema de monitoramento orientado a eventos" (Projeto2.pdf) built on
 * top of Here To Slay's existing Kafka topics. Reads game-actions-in and
 * game-state-out only - it never writes back into the imperative game
 * engine's topics, so it cannot affect real gameplay if something here is
 * wrong. Detects 5 situations, writing derived alerts to
 * game-monitoring-alerts for the Gateway to fan out as in-game notifications.
 *
 * See plans/here-to-slay-etapa2 for the full design writeup and the PDF
 * requirement-to-situation mapping.
 */
public class GameMonitoringStreamsProcessor {

    public static final String STREAK_STORE_NAME = "streak-store";
    public static final String BUYER_STREAK_STORE_NAME = "buyer-streak-store";
    public static final String RNG_STREAK_STORE_NAME = "rng-streak-store";

    public static void main(String[] args) {
        Properties config = new Properties();
        config.put(StreamsConfig.APPLICATION_ID_CONFIG, "heretoslay-monitoring");
        String kafkaServer = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
        config.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, kafkaServer != null ? kafkaServer : "localhost:9092");
        config.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass().getName());
        config.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass().getName());
        // jre-alpine (musl) can't load RocksDB's glibc-linked native library - use
        // in-memory stores everywhere (joins, windowed aggregations, the streak
        // store) instead. Fine for a monitoring/alerting side-service: the
        // changelog topics Kafka Streams backs these with are enough fault tolerance.
        config.put(StreamsConfig.DEFAULT_DSL_STORE_CONFIG, StreamsConfig.IN_MEMORY);

        Topology topology = buildTopology();
        try {
            KafkaStreams streams = new KafkaStreams(topology, config);
            streams.start();
            System.out.println("Serviço de Monitoramento (Kafka Streams / CEP) do Here To Slay iniciado!");
            Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
        } catch (Exception e) {
            System.err.println("Erro ao iniciar o serviço de monitoramento: " + e.getMessage());
        }
    }

    /**
     * Builds the topology without starting it - split out from main() so tests can
     * drive it with TopologyTestDriver (no live Kafka broker needed).
     */
    public static Topology buildTopology() {
        StreamsBuilder builder = new StreamsBuilder();

        // In-memory, not RocksDB: the jre-alpine (musl) runtime image used by this
        // service's Dockerfile can't load RocksDB's glibc-linked native library, and
        // a monitoring/alerting side-service doesn't need disk-persisted state -
        // the changelog topic Kafka Streams backs this with is enough fault tolerance.
        StoreBuilder<KeyValueStore<String, String>> streakStore = Stores.keyValueStoreBuilder(
                Stores.inMemoryKeyValueStore(STREAK_STORE_NAME), Serdes.String(), Serdes.String());
        builder.addStateStore(streakStore);

        StoreBuilder<KeyValueStore<String, String>> buyerStreakStore = Stores.keyValueStoreBuilder(
                Stores.inMemoryKeyValueStore(BUYER_STREAK_STORE_NAME), Serdes.String(), Serdes.String());
        builder.addStateStore(buyerStreakStore);

        StoreBuilder<KeyValueStore<String, String>> rngStreakStore = Stores.keyValueStoreBuilder(
                Stores.inMemoryKeyValueStore(RNG_STREAK_STORE_NAME), Serdes.String(), Serdes.String());
        builder.addStateStore(rngStreakStore);

        // Stateless: parsing/validating the two raw topics this service observes.
        KStream<String, String> actionsIn = builder.stream("game-actions-in", Consumed.with(Serdes.String(), Serdes.String()))
                .filter((key, value) -> isValidJson(value));

        KStream<String, String> statesOut = builder.stream("game-state-out", Consumed.with(Serdes.String(), Serdes.String()))
                .filter((key, value) -> isValidJson(value));

        // Situação 1 (evento composto): join stream-stream por matchId - correlaciona
        // a ação do jogador com o novo estado que o servidor produziu em resposta.
        actionsIn.join(
                        statesOut,
                        ActionProcessedEvent::correlate,
                        JoinWindows.ofTimeDifferenceWithNoGrace(Duration.ofSeconds(2)),
                        StreamJoined.with(Serdes.String(), Serdes.String(), Serdes.String()))
                .filter((key, value) -> value != null)
                .to("game-monitoring-alerts");

        // Situação 2: foco de ataques - 2+ jogadores atacando o mesmo alvo
        // numa janela deslizante de 30s. Chave composta "matchId|targetPlayerId"
        // preserva o matchId (perdido ao reagrupar por alvo) para a saída.
        actionsIn
                .filter((key, value) -> targetPlayerOf(value) != null)
                .map((key, value) -> KeyValue.pair(key + "|" + targetPlayerOf(value), value))
                .groupByKey(Grouped.with(Serdes.String(), Serdes.String()))
                .windowedBy(TimeWindows.ofSizeAndGrace(Duration.ofSeconds(30), Duration.ZERO))
                .count()
                .toStream()
                .filter((windowedKey, count) -> count != null && count >= 2)
                .map((windowedKey, count) -> {
                    String[] parts = windowedKey.key().split("\\|", 2);
                    String matchId = parts[0];
                    String targetPlayerId = parts.length > 1 ? parts[1] : "";
                    return KeyValue.pair(matchId, MonitoringAlert.focusedTarget(targetPlayerId, count));
                })
                .to("game-monitoring-alerts");

        // Situação 3: Processor API + state store -
        // ver LuckStreakProcessor. Statefull, mas não usa windowedBy do DSL: os
        // próprios streaks (intervalos de estado) fazem o papel da "janela".
        actionsIn
                .filter((key, value) -> "process_hero_roll".equals(actionNameOf(value)))
                .process(LuckStreakProcessor::new, STREAK_STORE_NAME)
                .to("game-monitoring-alerts");

        // Situação 4: partida travada - session window com gap de
        // inatividade; quando uma sessão de atividade se fecha, o ritmo caiu.
        actionsIn
                .groupByKey(Grouped.with(Serdes.String(), Serdes.String()))
                .windowedBy(SessionWindows.ofInactivityGapWithNoGrace(Duration.ofSeconds(60)))
                .count()
                .toStream()
                .filter((windowedKey, count) -> count != null)
                .map((windowedKey, count) -> KeyValue.pair(windowedKey.key(),
                        MonitoringAlert.matchStalled(windowedKey.window().end() - windowedKey.window().start())))
                .to("game-monitoring-alerts");

        // Situação 5: efeito em cadeia - 3+ ações na mesma
        // partida resolvidas dentro de uma janela curta (tumbling, 35s).
        actionsIn
                .groupByKey(Grouped.with(Serdes.String(), Serdes.String()))
                .windowedBy(TimeWindows.ofSizeAndGrace(Duration.ofSeconds(35), Duration.ZERO))
                .count()
                .toStream()
                .filter((windowedKey, count) -> count != null && count >= 3)
                .map((windowedKey, count) -> KeyValue.pair(windowedKey.key(), MonitoringAlert.chainReaction(count)))
                .to("game-monitoring-alerts");

        // Situação 6: "Frequent Buyer" -
        // Processor API + state store, streak de draw_card consecutivos por jogador
        // (qualquer outra ação do mesmo jogador zera o streak). Fácil de testar:
        // um jogador que só dá draw_card 6x seguidas sem fazer mais nada.
        actionsIn
                .process(FrequentBuyerProcessor::new, BUYER_STREAK_STORE_NAME)
                .to("game-monitoring-alerts");

        // Situação 7: "Focusing on X" / "Focused" - mesmo atacante mirando o mesmo alvo
        // 3+ vezes numa janela de 2 minutos (proxy para "últimos 2 turnos", já que
        // o serviço de monitoramento não enxerga limites de turno). Gera duas tags:
        // uma para quem está focando, outra para quem está sendo focado.
        actionsIn
                .filter((key, value) -> attackerTargetOf(value) != null)
                .map((key, value) -> KeyValue.pair(key + "|" + attackerTargetOf(value), value))
                .groupByKey(Grouped.with(Serdes.String(), Serdes.String()))
                .windowedBy(TimeWindows.ofSizeAndGrace(Duration.ofMinutes(2), Duration.ZERO))
                .count()
                .toStream()
                .filter((windowedKey, count) -> count != null && count >= 3)
                .flatMap((windowedKey, count) -> {
                    String[] parts = windowedKey.key().split("\\|", 3);
                    String matchId = parts[0];
                    String attackerId = parts.length > 1 ? parts[1] : "";
                    String targetId = parts.length > 2 ? parts[2] : "";
                    return java.util.List.of(
                            KeyValue.pair(matchId, MonitoringAlert.focusing(attackerId, targetId, count)),
                            KeyValue.pair(matchId, MonitoringAlert.focused(targetId, attackerId)));
                })
                .to("game-monitoring-alerts");

        // Situação 8: "RNG Diff" - streak de ataques a monstro sem matar (fight-back
        // ou sobrevida) por jogador. Lê game-state-out (resultado já resolvido
        // pelo servidor em Match.resolveMonsterAttack), não a ação bruta do
        // cliente. Um monster_slain zera o streak.
        statesOut
                .process(RngDiffProcessor::new, RNG_STREAK_STORE_NAME)
                .to("game-monitoring-alerts");

        return builder.build();
    }

    private static boolean isValidJson(String value) {
        try {
            new JSONObject(value);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static String actionNameOf(String value) {
        try {
            return new JSONObject(value).optString("action", null);
        } catch (Exception e) {
            return null;
        }
    }

    private static String targetPlayerOf(String value) {
        try {
            JSONObject json = new JSONObject(value);
            if (!"select_effect_target".equals(json.optString("action"))) return null;
            JSONObject payload = json.optJSONObject("payload");
            return payload == null ? null : payload.optString("player_id", null);
        } catch (Exception e) {
            return null;
        }
    }

    private static String attackerTargetOf(String value) {
        try {
            JSONObject json = new JSONObject(value);
            String attackerId = json.optString("playerId", null);
            String targetId = targetPlayerOf(value);
            if (attackerId == null || targetId == null || attackerId.equals(targetId)) return null;
            return attackerId + "|" + targetId;
        } catch (Exception e) {
            return null;
        }
    }
}
