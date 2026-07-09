package org.br.heretoslay.streams.monitoring;

import org.apache.kafka.streams.processor.api.Processor;
import org.apache.kafka.streams.processor.api.ProcessorContext;
import org.apache.kafka.streams.processor.api.Record;
import org.apache.kafka.streams.state.KeyValueStore;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Situação 1 (histórico de ações): replaces the old "evento composto" join.
 * Aggregates every action-in event into a capped JSON array kept in a state
 * store keyed by matchId, and forwards the whole (capped) list on every new
 * entry - so a client that (re)connects mid-match still sees full context,
 * not just whatever arrives after it starts listening. See
 * GameMonitoringStreamsProcessor for how this is wired in.
 */
public class ActionHistoryProcessor implements Processor<String, String, String, String> {

    private static final int MAX_HISTORY = 25;

    private KeyValueStore<String, String> historyStore;
    private ProcessorContext<String, String> context;

    @Override
    public void init(ProcessorContext<String, String> context) {
        this.context = context;
        this.historyStore = context.getStateStore(GameMonitoringStreamsProcessor.ACTION_HISTORY_STORE_NAME);
    }

    @Override
    public void process(Record<String, String> record) {
        JSONObject action;
        try {
            action = new JSONObject(record.value());
        } catch (Exception e) {
            return;
        }

        String actionName = action.optString("action", action.optString("subtype", null));
        if (actionName == null || "get_match_state".equals(actionName)) return;

        String matchId = record.key();
        JSONArray history = parseHistory(historyStore.get(matchId));

        JSONObject entry = new JSONObject()
                .put("playerId", action.optString("playerId", ""))
                .put("action", actionName)
                .put("timestamp", record.timestamp());
        history.put(entry);
        while (history.length() > MAX_HISTORY) {
            history.remove(0);
        }

        historyStore.put(matchId, history.toString());
        context.forward(new Record<>(matchId, MonitoringAlert.actionHistory(history), record.timestamp()));
    }

    private static JSONArray parseHistory(String raw) {
        if (raw == null) return new JSONArray();
        try {
            return new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }
}
