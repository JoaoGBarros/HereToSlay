package org.br.heretoslay.streams.monitoring;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Construtor de payloads de alertas de monitoramento para cada situação detectada.
 * 
 * Constrói o payload de transmissão para todas as 10 situações que o serviço de
 * monitoramento detecta. O campo targetPlayers é sempre o sentinel "MATCH_ALL" - 
 * o Gateway o resolve para os IDs de jogadores reais da partida (chave do registro
 * Kafka) consultando seu cache de match-state-store, da mesma forma que MatchService
 * já resolve targetPlayers para game-state-out.
 */
public class MonitoringAlert {

    /**
     * Envolve a situação, mensagem e dados extras em um payload JSON completo
     * pronto para transmissão.
     *
     * @param situation Tipo de situação detectada (ex: "ACTION_HISTORY", "FOCUSED_TARGET")
     * @param message Mensagem de alerta legível para exibição
     * @param extra Dados extras específicos da situação em formato JSON
     * @return String JSON completa do alerta pronto para envio
     */
    private static String wrap(String situation, String message, JSONObject extra) {
        JSONObject payload = new JSONObject();
        payload.put("type", "monitoring_alert");
        payload.put("situation", situation);
        payload.put("message", message);
        payload.put("extra", extra);

        JSONObject wrapper = new JSONObject();
        wrapper.put("targetPlayers", new JSONArray().put("MATCH_ALL"));
        wrapper.put("payload", payload);
        return wrapper.toString();
    }

    /**
     * Gera alerta para (histórico de ações atualizado).
     *
     * @param history Array JSON com o histórico de ações limitado
     * @return String JSON do alerta
     */
    public static String actionHistory(JSONArray history) {
        JSONObject extra = new JSONObject().put("history", history);
        return wrap("ACTION_HISTORY", "Action history updated", extra);
    }

    /**
     * Gera alerta para (alvo sendo focado por múltiplos jogadores).
     *
     * @param targetPlayerId ID do jogador sendo atacado
     * @param attackCount Número de ataques simultâneos
     * @return String JSON do alerta
     */
    public static String focusedTarget(String targetPlayerId, long attackCount) {
        JSONObject extra = new JSONObject().put("targetPlayerId", targetPlayerId).put("attackCount", attackCount);
        return wrap("FOCUSED_TARGET", "🎯 Attacks are piling up on " + targetPlayerId + "!", extra);
    }

    /**
     * Gera alerta para (reviravolta de sorte entre dois jogadores).
     *
     * @param playerA ID do jogador cuja sequência fechou
     * @param playerB ID do jogador rival com sequência aberta oposta
     * @param relation Relação de Allen entre as duas sequências
     * @return String JSON do alerta
     */
    public static String turningPoint(String playerA, String playerB, String relation) {
        JSONObject extra = new JSONObject().put("playerA", playerA).put("playerB", playerB).put("relation", relation);
        return wrap("TURNING_POINT", "🔄 Luck just turned between two players!", extra);
    }

    /**
     * Gera alerta para (reação em cadeia de ações).
     *
     * @param actionCount Número de ações em cadeia
     * @return String JSON do alerta
     */
    public static String chainReaction(long actionCount) {
        JSONObject extra = new JSONObject().put("actionCount", actionCount);
        return wrap("CHAIN_REACTION", "⚡ Chain reaction! Several actions resolved back to back", extra);
    }

    // ---- Tags de comportamento temporário (situações CEP divertidas, item 9) ----
    // Cada uma carrega taggedPlayerId + tagType nos dados extras para que o frontend
    // possa exibir um pequeno badge próximo ao jogador, além do toast usual para todos.

    /**
     * Gera alerta para (comprador frequente).
     * 
     * Tag temporária que marca um jogador que desenhou muitas cartas consecutivas.
     *
     * @param playerId ID do jogador marcado
     * @param drawStreak Número de desenhos consecutivos
     * @return String JSON do alerta
     */
    public static String frequentBuyer(String playerId, int drawStreak) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", playerId)
                .put("tagType", "FREQUENT_BUYER")
                .put("drawStreak", drawStreak);
        return wrap("FREQUENT_BUYER", "🛒 Someone just drew cards " + drawStreak + " times in a row - tagged Frequent Buyer!", extra);
    }

    /**
     * Gera alerta para (jogador focando em um rival).
     *
     * @param attackerId ID do jogador que está focando
     * @param targetId ID do jogador sendo focado
     * @param targetCount Número de ataques ao mesmo alvo
     * @return String JSON do alerta
     */
    public static String focusing(String attackerId, String targetId, long targetCount) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", attackerId)
                .put("tagType", "FOCUSING")
                .put("targetId", targetId)
                .put("targetCount", targetCount);
        return wrap("FOCUSING", "🔎 A player keeps targeting the same rival - tagged Focusing!", extra);
    }

    /**
     * Gera alerta para (jogador sendo focado).
     *
     * @param targetId ID do jogador sendo focado
     * @param attackerId ID do jogador que está focando
     * @return String JSON do alerta
     */
    public static String focused(String targetId, String attackerId) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", targetId)
                .put("tagType", "FOCUSED")
                .put("byPlayerId", attackerId);
        return wrap("FOCUSED", "🎯 A player is getting singled out - tagged Focused!", extra);
    }

    /**
     * Gera alerta para (diferença RNG - ataques sem sucesso).
     *
     * @param playerId ID do jogador com falta de sorte
     * @param failStreak Número de ataques falhados consecutivos
     * @return String JSON do alerta
     */
    public static String rngDiff(String playerId, long failStreak) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", playerId)
                .put("tagType", "RNG_DIFF")
                .put("failStreak", failStreak);
        return wrap("RNG_DIFF", "🎲 The dice have not been kind lately - tagged RNG Diff!", extra);
    }

    /**
     * Gera alerta para (primeiro sangue - primeiro monstro derrotado).
     *
     * @param playerId ID do jogador que conquistou o primeiro sangue
     * @return String JSON do alerta
     */
    public static String firstBlood(String playerId) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", playerId)
                .put("tagType", "FIRST_BLOOD");
        return wrap("FIRST_BLOOD", "🩸 First blood! A monster has fallen - tagged First Blood!", extra);
    }

    /**
     * Gera alerta para (combo - 3 ações em rajada).
     *
     * @param playerId ID do jogador em combo
     * @param actionCount Número de ações em combo
     * @return String JSON do alerta
     */
    public static String combo(String playerId, long actionCount) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", playerId)
                .put("tagType", "COMBO")
                .put("actionCount", actionCount);
        return wrap("COMBO", "🔥 Quick hands! A player is on a combo - tagged Combo!", extra);
    }

    /**
     * Gera alerta para (alma generosa - buffou um rival).
     *
     * @param playerId ID do jogador generoso
     * @return String JSON do alerta
     */
    public static String generousSoul(String playerId) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", playerId)
                .put("tagType", "GENEROUS_SOUL");
        return wrap("GENEROUS_SOUL", "💝 What a generous soul - buffed a rival! Tagged Generous Soul!", extra);
    }
}
