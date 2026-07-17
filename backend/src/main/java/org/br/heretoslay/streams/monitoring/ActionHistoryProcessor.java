package org.br.heretoslay.streams.monitoring;

import org.apache.kafka.streams.processor.api.Processor;
import org.apache.kafka.streams.processor.api.ProcessorContext;
import org.apache.kafka.streams.processor.api.Record;
import org.apache.kafka.streams.state.KeyValueStore;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Substitui o antigo "evento composto" join. Agrega cada evento de ação em um 
 * array JSON limitado, armazenado no estado keyed por matchId, e encaminha a 
 * lista inteira (limitada) a cada nova entrada. Assim, um cliente que se reconecta 
 * no meio da partida vê o contexto completo, não apenas o que chega após começar 
 * a ouvir.
 */
public class ActionHistoryProcessor implements Processor<String, String, String, String> {

    /** Número máximo de entradas mantidas no histórico de ações */
    private static final int MAX_HISTORY = 25;

    /** Armazena o histórico de ações por ID de partida */
    private KeyValueStore<String, String> historyStore;
    
    /** Contexto do processador para acessar lojas de estado e encaminhar registros */
    private ProcessorContext<String, String> context;

    /**
     * Inicializa o processador, obtendo acesso à loja de estado de histórico de ações.
     *
     * @param context Contexto do processador fornecido pelo Kafka Streams
     */
    @Override
    public void init(ProcessorContext<String, String> context) {
        this.context = context;
        this.historyStore = context.getStateStore(GameMonitoringStreamsProcessor.ACTION_HISTORY_STORE_NAME);
    }

    /**
     * Processa um registro de ação, adicionando-o ao histórico e encaminhando
     * a lista atualizada para alertas de monitoramento.
     *
     * @param record Registro contendo a chave (matchId) e o valor (ação em JSON)
     */
    @Override
    public void process(Record<String, String> record) {
        JSONObject action;
        try {
            action = new JSONObject(record.value());
        } catch (Exception e) {
            return;
        }

        // Extrai o nome da ação (pode estar em "action" ou "subtype")
        String actionName = action.optString("action", action.optString("subtype", null));
        // Ignora ações inválidas e solicitações de estado
        if (actionName == null || "get_match_state".equals(actionName)) return;

        // Obtém o ID da partida da chave do registro
        String matchId = record.key();
        // Carrega o histórico existente ou cria um novo array
        JSONArray history = parseHistory(historyStore.get(matchId));

        // Cria uma entrada com os dados da ação
        JSONObject entry = new JSONObject()
                .put("playerId", action.optString("playerId", ""))
                .put("action", actionName)
                .put("timestamp", record.timestamp());
        history.put(entry);
        
        // Mantém apenas as últimas MAX_HISTORY entradas
        while (history.length() > MAX_HISTORY) {
            history.remove(0);
        }

        // Persiste o histórico atualizado na loja de estado
        historyStore.put(matchId, history.toString());
        // Encaminha o alerta com o histórico completo atualizado
        context.forward(new Record<>(matchId, MonitoringAlert.actionHistory(history), record.timestamp()));
    }

    /**
     * Converte uma string JSON em um JSONArray, ou retorna um array vazio
     * se a string for nula ou inválida.
     *
     * @param raw String JSON representando o histórico
     * @return JSONArray contendo o histórico, ou array vazio se inválido
     */
    private static JSONArray parseHistory(String raw) {
        if (raw == null) return new JSONArray();
        try {
            return new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }
}
