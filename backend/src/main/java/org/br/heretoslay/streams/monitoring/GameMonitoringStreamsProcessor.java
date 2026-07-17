package org.br.heretoslay.streams.monitoring;

import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.KeyValue;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.Topology;
import org.apache.kafka.streams.kstream.Consumed;
import org.apache.kafka.streams.kstream.Grouped;
import org.apache.kafka.streams.kstream.KStream;
import org.apache.kafka.streams.kstream.TimeWindows;
import org.apache.kafka.streams.state.KeyValueStore;
import org.apache.kafka.streams.state.StoreBuilder;
import org.apache.kafka.streams.state.Stores;
import org.json.JSONObject;

import java.time.Duration;
import java.util.Properties;

/**
 * Sistema de monitoramento orientado a eventos (Complex Event Processing - CEP).
 * 
 * Implementa "Um sistema de monitoramento orientado a eventos",
 * construído sobre os tópicos Kafka existentes do Here To Slay. Monitora apenas
 * os tópicos game-actions-in e game-state-out, nunca escrevendo de volta nos
 * tópicos do motor de jogo imperativo, garantindo que erros aqui não afetem
 * a jogabilidade real.
 * 
 * Detecta 10 situações diferentes e escreve alertas derivados em game-monitoring-alerts
 * para que o Gateway os distribua como notificações no jogo.
 */
public class GameMonitoringStreamsProcessor {

    /** Nome da loja de estado para rastreamento de sequências de sorte */
    public static final String STREAK_STORE_NAME = "streak-store";
    
    /** Nome da loja de estado para rastreamento de sequências de compra */
    public static final String BUYER_STREAK_STORE_NAME = "buyer-streak-store";
    
    /** Nome da loja de estado para rastreamento de sequências RNG */
    public static final String RNG_STREAK_STORE_NAME = "rng-streak-store";
    
    /** Nome da loja de estado para rastreamento de histórico de ações */
    public static final String ACTION_HISTORY_STORE_NAME = "action-history-store";
    
    /** Nome da loja de estado para rastreamento de primeiro sangue */
    public static final String FIRST_BLOOD_STORE_NAME = "first-blood-store";

    /**
     * Ponto de entrada principal que inicializa e inicia o processador de
     * monitoramento com Kafka Streams.
     *
     * @param args Argumentos de linha de comando (não utilizados)
     */
    public static void main(String[] args) {
        Properties config = new Properties();
        config.put(StreamsConfig.APPLICATION_ID_CONFIG, "heretoslay-monitoring");
        String kafkaServer = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
        config.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, kafkaServer != null ? kafkaServer : "localhost:9092");
        config.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass().getName());
        config.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass().getName());
        // jre-alpine (musl) não consegue carregar a biblioteca nativa do RocksDB
        // compilada para glibc. Usa lojas em memória em vez disso. Apropriado para
        // um serviço de monitoramento/alertas: os tópicos de changelog que o Kafka
        // Streams utiliza são suficientes para tolerância a falhas.
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
     * Constrói a topologia de Kafka Streams sem iniciá-la. Separado do main()
     * para permitir que testes utilizem TopologyTestDriver (sem necessidade
     * de um broker Kafka real).
     *
     * @return Topologia de fluxos com todas as 10 situações de monitoramento configuradas
     */
    public static Topology buildTopology() {
        StreamsBuilder builder = new StreamsBuilder();

        // Lojas em memória, não RocksDB: a imagem de runtime jre-alpine (musl) usada
        // pelo Dockerfile deste serviço não consegue carregar a biblioteca nativa do 
        // RocksDB compilada para glibc. Um serviço de monitoramento/alertas não precisa
        // de estado persistido em disco - o tópico de changelog que o Kafka Streams
        // utiliza é suficiente para tolerância a falhas.
        StoreBuilder<KeyValueStore<String, String>> streakStore = Stores.keyValueStoreBuilder(
                Stores.inMemoryKeyValueStore(STREAK_STORE_NAME), Serdes.String(), Serdes.String());
        builder.addStateStore(streakStore);

        StoreBuilder<KeyValueStore<String, String>> buyerStreakStore = Stores.keyValueStoreBuilder(
                Stores.inMemoryKeyValueStore(BUYER_STREAK_STORE_NAME), Serdes.String(), Serdes.String());
        builder.addStateStore(buyerStreakStore);

        StoreBuilder<KeyValueStore<String, String>> rngStreakStore = Stores.keyValueStoreBuilder(
                Stores.inMemoryKeyValueStore(RNG_STREAK_STORE_NAME), Serdes.String(), Serdes.String());
        builder.addStateStore(rngStreakStore);

        StoreBuilder<KeyValueStore<String, String>> actionHistoryStore = Stores.keyValueStoreBuilder(
                Stores.inMemoryKeyValueStore(ACTION_HISTORY_STORE_NAME), Serdes.String(), Serdes.String());
        builder.addStateStore(actionHistoryStore);

        StoreBuilder<KeyValueStore<String, String>> firstBloodStore = Stores.keyValueStoreBuilder(
                Stores.inMemoryKeyValueStore(FIRST_BLOOD_STORE_NAME), Serdes.String(), Serdes.String());
        builder.addStateStore(firstBloodStore);

        // Operações sem estado: análise e validação dos dois tópicos brutos que este serviço observa.
        KStream<String, String> actionsIn = builder.stream("game-actions-in", Consumed.with(Serdes.String(), Serdes.String()))
                .filter((key, value) -> isValidJson(value));

        KStream<String, String> statesOut = builder.stream("game-state-out", Consumed.with(Serdes.String(), Serdes.String()))
                .filter((key, value) -> isValidJson(value));

        // SITUAÇÃO 1: Histórico de ações
        // Usa Processor API + loja de estado (ver ActionHistoryProcessor). Cada ação nova é
        // anexada a uma lista por partida (limitada a 25 entradas) e a lista inteira é reenviada.
        // Assim, um cliente que se reconecta no meio da partida vê o histórico completo.
        actionsIn
                .process(ActionHistoryProcessor::new, ACTION_HISTORY_STORE_NAME)
                .to("game-monitoring-alerts");

        // SITUAÇÃO 2: Foco de ataques
        // Detecta 2+ jogadores atacando o mesmo alvo em uma janela deslizante de 30s.
        // Chave composta "matchId|targetPlayerId" preserva o matchId para a saída.
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

        // SITUAÇÃO 3: Reviravolta de Sorte
        // Usa Processor API + loja de estado (ver LuckStreakProcessor). Com estado, mas sem
        // usar windowedBy do DSL: os próprios intervalos de sequência fazem o papel da "janela".
        actionsIn
                .filter((key, value) -> "process_hero_roll".equals(actionNameOf(value)))
                .process(LuckStreakProcessor::new, STREAK_STORE_NAME)
                .to("game-monitoring-alerts");

        // SITUAÇÃO 4: Reação em Cadeia
        // Detecta 3+ ações na mesma partida resolvidas dentro de uma janela curta (35s, tumbling).
        actionsIn
                .groupByKey(Grouped.with(Serdes.String(), Serdes.String()))
                .windowedBy(TimeWindows.ofSizeAndGrace(Duration.ofSeconds(35), Duration.ZERO))
                .count()
                .toStream()
                .filter((windowedKey, count) -> count != null && count >= 3)
                .map((windowedKey, count) -> KeyValue.pair(windowedKey.key(), MonitoringAlert.chainReaction(count)))
                .to("game-monitoring-alerts");

        // SITUAÇÃO 5: Comprador Frequente
        // Usa Processor API + loja de estado. Rastreia sequências de draw_card consecutivos
        // por jogador. Qualquer outra ação do mesmo jogador zera a sequência.
        actionsIn
                .process(FrequentBuyerProcessor::new, BUYER_STREAK_STORE_NAME)
                .to("game-monitoring-alerts");

        // SITUAÇÃO 6: Focando / Focado
        // Mesmo atacante mirando o mesmo alvo 3+ vezes em uma janela de 2 minutos
        // (proxy para "últimos 2 turnos"). Gera duas tags: uma para quem foca, outra para quem é focado.
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

        // SITUAÇÃO 7: Diferença RNG
        // Rastreia sequências de ataques a monstro sem vitória (luta-de-volta ou sobrevida)
        // por jogador. Lê game-state-out (resultado já resolvido pelo servidor em
        // Match.resolveMonsterAttack). Uma vitória zera a sequência.
        statesOut
                .process(RngDiffProcessor::new, RNG_STREAK_STORE_NAME)
                .to("game-monitoring-alerts");

        // SITUAÇÃO 8: Primeiro Sangue
        // Usa Processor API + loja de estado (flag único por partida). Dispara uma única vez,
        // na primeira vez que QUALQUER monstro é abatido na partida.
        statesOut
                .process(FirstBloodProcessor::new, FIRST_BLOOD_STORE_NAME)
                .to("game-monitoring-alerts");

        // SITUAÇÃO 9: Combo
        // Com estado via DSL: mesmo jogador realizando 3 ações em rajada dentro de uma
        // janela curta (6s, tumbling). Chave composta "matchId|playerId".
        actionsIn
                .filter((key, value) -> actorOf(value) != null)
                .map((key, value) -> KeyValue.pair(key + "|" + actorOf(value), value))
                .groupByKey(Grouped.with(Serdes.String(), Serdes.String()))
                .windowedBy(TimeWindows.ofSizeAndGrace(Duration.ofSeconds(6), Duration.ZERO))
                .count()
                .toStream()
                .filter((windowedKey, count) -> count != null && count == 3)
                .map((windowedKey, count) -> {
                    String[] parts = windowedKey.key().split("\\|", 2);
                    String matchId = parts[0];
                    String playerId = parts.length > 1 ? parts[1] : "";
                    return KeyValue.pair(matchId, MonitoringAlert.combo(playerId, count));
                })
                .to("game-monitoring-alerts");

        // SITUAÇÃO 10: Alma Generosa
        // Totalmente sem estado (filter + map): um jogador joga um Modificador positivo
        // no roll de OUTRO jogador.
        actionsIn
                .filter((key, value) -> isGenerousModifier(value))
                .map((key, value) -> KeyValue.pair(key, MonitoringAlert.generousSoul(actorOf(value))))
                .to("game-monitoring-alerts");

        return builder.build();
    }

    /**
     * Valida se uma string é um JSON válido.
     *
     * @param value String a ser validada
     * @return true se é um JSON válido, false caso contrário
     */
    private static boolean isValidJson(String value) {
        try {
            new JSONObject(value);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Extrai o nome da ação de um JSON de evento.
     *
     * @param value String JSON contendo o evento
     * @return Nome da ação, ou null se não puder ser extraído
     */
    private static String actionNameOf(String value) {
        try {
            return new JSONObject(value).optString("action", null);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Extrai o ID do jogador que realiza a ação.
     *
     * @param value String JSON contendo a ação
     * @return ID do jogador, ou null se não puder ser extraído
     */
    private static String actorOf(String value) {
        try {
            return new JSONObject(value).optString("playerId", null);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Extrai o ID do jogador alvo de uma ação select_effect_target.
     *
     * @param value String JSON contendo a ação
     * @return ID do jogador alvo, ou null se não puder ser extraído
     */
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

    /**
     * Extrai a combinação atacante|alvo de uma ação de ataque.
     *
     * @param value String JSON contendo a ação
     * @return Combinação "attackerId|targetId", ou null se não puder ser extraída
     */
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

    /**
     * Verifica se uma ação de play_modifier é um modificador generoso (valor positivo
     * direcionado a outro jogador).
     *
     * @param value String JSON contendo a ação
     * @return true se é um modificador generoso, false caso contrário
     */
    private static boolean isGenerousModifier(String value) {
        try {
            JSONObject json = new JSONObject(value);
            if (!"play_modifier".equals(json.optString("action"))) return false;
            JSONObject payload = json.optJSONObject("payload");
            if (payload == null) return false;
            int chosenValue = payload.optInt("chosen_value", 0);
            String targetPlayerId = payload.optString("target_player_id", null);
            String playerId = json.optString("playerId", null);
            return chosenValue > 0 && targetPlayerId != null && playerId != null && !targetPlayerId.equals(playerId);
        } catch (Exception e) {
            return false;
        }
    }
}
