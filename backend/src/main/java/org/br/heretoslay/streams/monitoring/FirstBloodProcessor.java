package org.br.heretoslay.streams.monitoring;

import org.apache.kafka.streams.processor.api.Processor;
import org.apache.kafka.streams.processor.api.ProcessorContext;
import org.apache.kafka.streams.processor.api.Record;
import org.apache.kafka.streams.state.KeyValueStore;
import org.json.JSONObject;

/**
 * "First Blood" badge (item 9, novo): fires exactly once per match, the
 * first time any monster is slain (game-state-out's monster_slain
 * animation - see Match.resolveMonsterAttack). Trivial single-flag state
 * store - easy to test with a single successful monster kill.
 */
public class FirstBloodProcessor implements Processor<String, String, String, String> {

    private KeyValueStore<String, String> firstBloodStore;
    private ProcessorContext<String, String> context;

    @Override
    public void init(ProcessorContext<String, String> context) {
        this.context = context;
        this.firstBloodStore = context.getStateStore(GameMonitoringStreamsProcessor.FIRST_BLOOD_STORE_NAME);
    }

    @Override
    public void process(Record<String, String> record) {
        JSONObject event;
        try {
            event = new JSONObject(record.value());
        } catch (Exception e) {
            return;
        }
        JSONObject inner = event.optJSONObject("payload");
        if (inner == null || !"animation".equals(inner.optString("type"))) return;
        if (!"monster_slain".equals(inner.optString("subtype"))) return;

        JSONObject payload = inner.optJSONObject("payload");
        if (payload == null) return;
        String playerId = payload.optString("playerId", null);
        if (playerId == null) return;

        String matchId = record.key();
        if (firstBloodStore.get(matchId) != null) return;

        firstBloodStore.put(matchId, playerId);
        context.forward(new Record<>(matchId, MonitoringAlert.firstBlood(playerId), record.timestamp()));
    }
}
