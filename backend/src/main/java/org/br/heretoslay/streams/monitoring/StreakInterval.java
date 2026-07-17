package org.br.heretoslay.streams.monitoring;

import org.json.JSONObject;

/**
 * Representa a sequência de sorte atual de um jogador (quente ou fria).
 * 
 * Mantém o registro de uma sequência de rolls de herói bem-sucedidos (quente)
 * ou fracassados (frio), representada como um intervalo semi-aberto [início, fim).
 * 
 * "Sucesso" aqui é uma simplificação: roll >= HOT_THRESHOLD, pois o serviço de
 * monitoramento só vê game-actions-in e não o minValue específico do herói usado
 * pelo motor real - suficiente para uma tendência ilustrativa, mas não exatamente
 * a lógica do jogo.
 */
public class StreakInterval {

    /** Enumeração para indicar se a sequência é de sorte boa (quente) ou ruim (fria) */
    public enum Type { HOT, COLD }

    /** ID da partida onde a sequência ocorre */
    private final String matchId;
    
    /** ID do jogador que possui a sequência */
    private final String playerId;
    
    /** Tipo de sequência: HOT (sorte boa) ou COLD (sorte ruim) */
    private final Type type;
    
    /** Timestamp do início da sequência */
    private final long start;
    
    /** Timestamp do fim da sequência (ou fim da última ação se ainda aberta) */
    private long end;
    
    /** Flag indicando se a sequência ainda está em progresso */
    private boolean open;

    /**
     * Cria um novo intervalo de sequência com os parâmetros especificados.
     *
     * @param matchId ID da partida
     * @param playerId ID do jogador
     * @param type HOT ou COLD
     * @param start Timestamp de início
     * @param end Timestamp de fim
     * @param open true se a sequência está em progresso, false se fechada
     */
    public StreakInterval(String matchId, String playerId, Type type, long start, long end, boolean open) {
        this.matchId = matchId;
        this.playerId = playerId;
        this.type = type;
        this.start = start;
        this.end = end;
        this.open = open;
    }

    /**
     * Atualiza a sequência de sorte baseado em um novo resultado de roll.
     * Se o tipo de sorte mudou (quente para frio ou vice-versa), fecha a sequência
     * anterior e cria uma nova.
     *
     * @param previous Sequência anterior, ou null se nenhuma existe
     * @param matchId ID da partida
     * @param playerId ID do jogador
     * @param success true se o roll foi bem-sucedido (quente), false se falhou (frio)
     * @param timestamp Timestamp do novo roll
     * @return Objeto Update contendo a sequência atual e a que fechou (se houver)
     */
    public static StreakInterval.Update update(StreakInterval previous, String matchId, String playerId, boolean success, long timestamp) {
        Type newType = success ? Type.HOT : Type.COLD;

        // Se não havia sequência anterior ou o tipo mudou, inicia uma nova
        if (previous == null || previous.type != newType) {
            StreakInterval closed = previous;
            if (closed != null) {
                // Fecha a sequência anterior
                closed.open = false;
            }
            // Cria uma nova sequência aberta
            StreakInterval fresh = new StreakInterval(matchId, playerId, newType, timestamp, timestamp, true);
            return new Update(fresh, closed);
        }

        // Mesmo tipo: apenas atualiza o fim da sequência
        previous.end = timestamp;
        return new Update(previous, null);
    }

    /**
     * Record que encapsula o resultado de uma atualização de sequência.
     * Contém a sequência atual e a que fechou (se alguma).
     */
    public record Update(StreakInterval current, StreakInterval justClosed) {
    }

    /**
     * Verifica se esta sequência está aberta e é do tipo oposto a outra.
     * Útil para detectar reviravoltas de sorte entre dois jogadores.
     *
     * @param other Outra sequência para comparar
     * @return true se esta sequência está aberta e é de tipo diferente
     */
    public boolean isOpenAndOpposite(StreakInterval other) {
        return this.open && this.type != other.type;
    }

    /**
     * Obtém o ID da partida.
     *
     * @return ID da partida
     */
    public String getMatchId() {
        return matchId;
    }

    /**
     * Obtém o ID do jogador.
     *
     * @return ID do jogador
     */
    public String getPlayerId() {
        return playerId;
    }

    /**
     * Obtém o timestamp de início da sequência.
     *
     * @return Timestamp de início
     */
    public long getStart() {
        return start;
    }

    /**
     * Obtém o timestamp de fim (ou última atualização) da sequência.
     *
     * @return Timestamp de fim
     */
    public long getEnd() {
        return end;
    }

    /**
     * Serializa este intervalo de sequência para JSON.
     *
     * @return String JSON contendo todos os dados da sequência
     */
    public String toJson() {
        return new JSONObject()
                .put("matchId", matchId)
                .put("playerId", playerId)
                .put("type", type.name())
                .put("start", start)
                .put("end", end)
                .put("open", open)
                .toString();
    }

    /**
     * Desserializa um intervalo de sequência a partir de uma string JSON.
     *
     * @param json String JSON contendo dados de sequência
     * @return StreakInterval reconvertido para objeto, ou null se a string for nula
     */
    public static StreakInterval fromJson(String json) {
        if (json == null) return null;
        JSONObject obj = new JSONObject(json);
        return new StreakInterval(
                obj.getString("matchId"),
                obj.getString("playerId"),
                Type.valueOf(obj.getString("type")),
                obj.getLong("start"),
                obj.getLong("end"),
                obj.getBoolean("open")
        );
    }
}
