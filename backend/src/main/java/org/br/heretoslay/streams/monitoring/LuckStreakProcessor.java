package org.br.heretoslay.streams.monitoring;

import org.apache.kafka.streams.processor.api.Processor;
import org.apache.kafka.streams.processor.api.ProcessorContext;
import org.apache.kafka.streams.processor.api.Record;
import org.apache.kafka.streams.state.KeyValueIterator;
import org.apache.kafka.streams.state.KeyValueStore;
import org.json.JSONObject;

/**
 * Componente com estado da (Reviravolta de Sorte).
 * 
 * Rastreia a sequência de sorte atual de cada jogador (StreakInterval) em uma
 * loja de estado. Quando uma sequência se fecha (a sorte do jogador vira),
 * classifica sua relação de Allen contra todas as outras sequências ainda abertas
 * na mesma partida. Apenas as relações genuinamente sobrepostas (ver
 * AllenRelation.isNoteworthy) produzem um alerta.
 * 
 * @see GameMonitoringStreamsProcessor para entender como este processador é
 *      integrado à topologia de fluxos.
 */
public class LuckStreakProcessor implements Processor<String, String, String, String> {

    /** Limite de pontos para considerar um roll como "sorte boa" (quente) */
    private static final int HOT_THRESHOLD = 6;

    /** Armazena os intervalos de sequência de sorte por ID de jogador */
    private KeyValueStore<String, String> streakStore;
    
    /** Contexto do processador para encaminhar registros */
    private ProcessorContext<String, String> context;

    /**
     * Inicializa o processador, obtendo acesso à loja de estado de sequências.
     *
     * @param context Contexto do processador fornecido pelo Kafka Streams
     */
    @Override
    public void init(ProcessorContext<String, String> context) {
        this.context = context;
        this.streakStore = context.getStateStore(GameMonitoringStreamsProcessor.STREAK_STORE_NAME);
    }

    /**
     * Processa um evento process_hero_roll. Atualiza ou cria a sequência de sorte
     * do jogador. Se uma sequência fechou (fortune flip), classifica sua relação
     * de Allen contra todas as outras sequências abertas da partida.
     *
     * @param record Registro contendo o evento de roll de herói
     */
    @Override
    public void process(Record<String, String> record) {
        JSONObject action;
        try {
            action = new JSONObject(record.value());
        } catch (Exception e) {
            return;
        }
        if (!"process_hero_roll".equals(action.optString("action"))) return;

        // Extrai dados do jogador e resultado do roll
        String playerId = action.optString("playerId", null);
        JSONObject payload = action.optJSONObject("payload");
        if (playerId == null || payload == null || !payload.has("roll")) return;

        // Determina se o roll foi bem-sucedido (quente) ou não (frio)
        String matchId = record.key();
        int roll = payload.optInt("roll", -1);
        boolean success = roll >= HOT_THRESHOLD;

        // Obtém a sequência anterior do jogador e a atualiza
        StreakInterval previous = StreakInterval.fromJson(streakStore.get(playerId));
        StreakInterval.Update update = StreakInterval.update(previous, matchId, playerId, success, record.timestamp());
        streakStore.put(playerId, update.current().toJson());

        // Se nenhuma sequência fechou, não há comparação a fazer
        if (update.justClosed() == null) return;
        StreakInterval closed = update.justClosed();

        // Compara a sequência que fechou com todas as outras abertas
        try (KeyValueIterator<String, String> all = streakStore.all()) {
            while (all.hasNext()) {
                var entry = all.next();
                // Pula o próprio jogador
                if (entry.key.equals(playerId)) continue;
                
                StreakInterval rival = StreakInterval.fromJson(entry.value);
                // Ignora sequências nulas ou de outras partidas
                if (rival == null || !rival.getMatchId().equals(matchId)) continue;
                // Só compara com sequências abertas de tipo oposto
                if (!rival.isOpenAndOpposite(closed)) continue;

                // Classifica a relação de Allen
                AllenRelation relation = AllenRelation.classify(closed, rival);
                // Gera alerta apenas para relações notáveis
                if (relation.isNoteworthy()) {
                    context.forward(new Record<>(matchId,
                            MonitoringAlert.turningPoint(playerId, rival.getPlayerId(), relation.name()),
                            record.timestamp()));
                }
            }
        }
    }
}
