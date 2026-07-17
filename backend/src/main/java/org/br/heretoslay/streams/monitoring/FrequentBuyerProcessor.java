package org.br.heretoslay.streams.monitoring;

import org.apache.kafka.streams.processor.api.Processor;
import org.apache.kafka.streams.processor.api.ProcessorContext;
import org.apache.kafka.streams.processor.api.Record;
import org.apache.kafka.streams.state.KeyValueStore;
import org.json.JSONObject;

/**
 * Processador para a tag "Comprador Frequente".
 * 
 * Rastreia a sequência atual de ações "draw_card" consecutivas de cada jogador
 * em uma loja de estado. Quando um jogador atinge o limite de desenhos consecutivos
 * (sem outra ação interleada), a tag é acionada e a sequência é zerada para
 * poder disparar novamente em uma nova execução.
 * 
 * Teste manual fácil: um único jogador executando draw_card 6 vezes seguidas
 * sem realizar nenhuma outra ação.
 */
public class FrequentBuyerProcessor implements Processor<String, String, String, String> {

    /** Número de desenhos consecutivos necessários para ativar a tag */
    private static final int DRAW_STREAK_THRESHOLD = 6;

    /** Armazena a sequência de desenhos por matchId|playerId */
    private KeyValueStore<String, String> streakStore;
    
    /** Contexto do processador para encaminhar alertas */
    private ProcessorContext<String, String> context;

    /**
     * Inicializa o processador, obtendo acesso à loja de estado de sequências.
     *
     * @param context Contexto do processador fornecido pelo Kafka Streams
     */
    @Override
    public void init(ProcessorContext<String, String> context) {
        this.context = context;
        this.streakStore = context.getStateStore(GameMonitoringStreamsProcessor.BUYER_STREAK_STORE_NAME);
    }

    /**
     * Processa uma ação de jogador. Se for um draw_card, incrementa a sequência;
     * caso contrário, zera a sequência. Se o limite for atingido, gera um alerta.
     *
     * @param record Registro contendo a ação do jogador
     */
    @Override
    public void process(Record<String, String> record) {
        JSONObject action;
        try {
            action = new JSONObject(record.value());
        } catch (Exception e) {
            return;
        }

        // Extrai ID do jogador e nome da ação
        String playerId = action.optString("playerId", null);
        String actionName = action.optString("action", null);
        if (playerId == null || actionName == null) return;

        // Constrói a chave de estado como matchId|playerId
        String matchId = record.key();
        String storeKey = matchId + "|" + playerId;

        // Se não for draw_card, zera a sequência
        if (!"draw_card".equals(actionName)) {
            streakStore.put(storeKey, "0");
            return;
        }

        // Incrementa a sequência de desenhos
        int streak = parseCount(streakStore.get(storeKey)) + 1;

        // Verifica se atingiu o limite
        if (streak >= DRAW_STREAK_THRESHOLD) {
            // Zera para poder disparar novamente
            streakStore.put(storeKey, "0");
            // Encaminha o alerta de comprador frequente
            context.forward(new Record<>(matchId, MonitoringAlert.frequentBuyer(playerId, streak), record.timestamp()));
        } else {
            // Atualiza a sequência
            streakStore.put(storeKey, String.valueOf(streak));
        }
    }

    /**
     * Converte uma string de contagem em inteiro, retornando 0 se nula ou inválida.
     *
     * @param raw String representando a contagem
     * @return Valor inteiro da contagem, ou 0 se inválido
     */
    private static int parseCount(String raw) {
        if (raw == null) return 0;
        try {
            return Integer.parseInt(raw);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
