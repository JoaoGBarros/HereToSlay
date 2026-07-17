package org.br.heretoslay.streams.monitoring;

import org.apache.kafka.streams.processor.api.Processor;
import org.apache.kafka.streams.processor.api.ProcessorContext;
import org.apache.kafka.streams.processor.api.Record;
import org.apache.kafka.streams.state.KeyValueStore;
import org.json.JSONObject;

/**
 * Processador para a conquista "Primeiro Sangue".
 * 
 * Dispara exatamente uma vez por partida, na primeira vez que QUALQUER monstro
 * é derrotado. Consulta a animação "monster_slain" em game-state-out 
 * (ver Match.resolveMonsterAttack). Utiliza uma loja de estado simples com 
 * uma única flag por partida - fácil de testar com um único ataque bem-sucedido 
 * a um monstro.
 */
public class FirstBloodProcessor implements Processor<String, String, String, String> {

    /** Loja de estado para rastrear se primeiro sangue já foi acionado por partida */
    private KeyValueStore<String, String> firstBloodStore;
    
    /** Contexto do processador para encaminhar registros */
    private ProcessorContext<String, String> context;

    /**
     * Inicializa o processador, obtendo acesso à loja de estado de primeiro sangue.
     *
     * @param context Contexto do processador fornecido pelo Kafka Streams
     */
    @Override
    public void init(ProcessorContext<String, String> context) {
        this.context = context;
        this.firstBloodStore = context.getStateStore(GameMonitoringStreamsProcessor.FIRST_BLOOD_STORE_NAME);
    }

    /**
     * Processa um evento de game-state-out, verificando se é uma animação de
     * monstro derrotado e gerando um alerta se for o primeiro na partida.
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
        // Verifica se é uma animação
        if (inner == null || !"animation".equals(inner.optString("type"))) return;
        // Verifica se é especificamente a animação de monstro derrotado
        if (!"monster_slain".equals(inner.optString("subtype"))) return;

        // Extrai o payload da animação para obter o ID do jogador
        JSONObject payload = inner.optJSONObject("payload");
        if (payload == null) return;
        String playerId = payload.optString("playerId", null);
        if (playerId == null) return;

        // Obtém o ID da partida da chave do registro
        String matchId = record.key();
        // Verifica se primeiro sangue já foi registrado para esta partida
        if (firstBloodStore.get(matchId) != null) return;

        // Registra quem conquistou o primeiro sangue
        firstBloodStore.put(matchId, playerId);
        // Encaminha o alerta de primeiro sangue
        context.forward(new Record<>(matchId, MonitoringAlert.firstBlood(playerId), record.timestamp()));
    }
}
