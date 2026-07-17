package org.br.heretoslay.streams.monitoring;

import org.apache.kafka.streams.processor.api.Processor;
import org.apache.kafka.streams.processor.api.ProcessorContext;
import org.apache.kafka.streams.processor.api.Record;
import org.apache.kafka.streams.state.KeyValueStore;
import org.json.JSONObject;

/**
 * Processador para a tag "Diferença RNG".
 * 
 * Rastreia a sequência de ataques a monstro falhados de cada jogador (fight-back
 * ou sobrevida) em uma loja de estado keyed por matchId|playerId. Uma sequência
 * de ataques falhados dispara a tag. Lê game-state-out (resultado já resolvido
 * pelo servidor em Match.resolveMonsterAttack), não a ação bruta do cliente,
 * então não pode ser falsificado por um roll ruim do cliente sozinho.
 * 
 * Uma vitória (monster_slain) zera a sequência.
 */
public class RngDiffProcessor implements Processor<String, String, String, String> {

    /** Número de ataques falhados consecutivos necessários para ativar a tag */
    private static final int FAIL_STREAK_THRESHOLD = 3;

    /** Armazena a sequência de ataques falhados por matchId|playerId */
    private KeyValueStore<String, String> streakStore;
    
    /** Contexto do processador para encaminhar alertas */
    private ProcessorContext<String, String> context;

    /**
     * Inicializa o processador, obtendo acesso à loja de estado de sequências RNG.
     *
     * @param context Contexto do processador fornecido pelo Kafka Streams
     */
    @Override
    public void init(ProcessorContext<String, String> context) {
        this.context = context;
        this.streakStore = context.getStateStore(GameMonitoringStreamsProcessor.RNG_STREAK_STORE_NAME);
    }

    /**
     * Processa um evento de game-state-out, verificando se é uma animação de
     * resultado de ataque a monstro. Se for um fracasso, incrementa a sequência;
     * se for uma vitória, zera. Se o limite de fracassos for atingido, gera um alerta.
     *
     * @param record Registro contendo o evento de estado do jogo
     */
    @Override
    public void process(Record<String, String> record) {
        JSONObject event;
        try {
            event = new JSONObject(record.value());
        } catch (Exception e) {
            return;
        }
        
        // Extrai o payload interno do evento
        JSONObject inner = event.optJSONObject("payload");
        if (inner == null) return;
        // Verifica se é uma animação
        if (!"animation".equals(inner.optString("type"))) return;

        // Extrai o tipo de resultado da animação
        String subtype = inner.optString("subtype", null);
        JSONObject payload = inner.optJSONObject("payload");
        if (subtype == null || payload == null) return;
        // Verifica se é um dos tipos de resultado de ataque a monstro
        if (!"monster_slain".equals(subtype) && !"monster_fight_back".equals(subtype) && !"monster_survives".equals(subtype)) return;

        // Extrai o ID do jogador que atacou
        String playerId = payload.optString("playerId", null);
        if (playerId == null) return;

        // Constrói a chave de estado como matchId|playerId
        String matchId = record.key();
        String storeKey = matchId + "|" + playerId;

        // Se foi uma vitória, zera a sequência de fracassos
        if ("monster_slain".equals(subtype)) {
            streakStore.put(storeKey, "0");
            return;
        }

        // Incrementa a sequência de fracassos (fight-back ou survive)
        int streak = parseCount(streakStore.get(storeKey)) + 1;

        // Verifica se atingiu o limite
        if (streak >= FAIL_STREAK_THRESHOLD) {
            // Zera para poder disparar novamente
            streakStore.put(storeKey, "0");
            // Encaminha o alerta de diferença RNG
            context.forward(new Record<>(matchId, MonitoringAlert.rngDiff(playerId, streak), record.timestamp()));
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
