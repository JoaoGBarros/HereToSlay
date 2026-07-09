package org.br.heretoslay.streams.monitoring;

import org.apache.kafka.streams.processor.api.Processor;
import org.apache.kafka.streams.processor.api.ProcessorContext;
import org.apache.kafka.streams.processor.api.Record;
import org.apache.kafka.streams.state.KeyValueStore;
import org.json.JSONObject;

/**
 * "RNG Diff" tag (item 9): tracks each player's current streak of monster
 * attacks that did NOT result in a slain monster (fight-back or survive)
 * via a state store keyed by matchId|playerId. A run of bad rolls without
 * an interleaved kill fires the tag. Reads game-state-out's
 * "animation"/"monster_slain"/"monster_fight_back"/"monster_survives"
 * broadcasts (see Match.resolveMonsterAttack) - server-resolved outcomes,
 * not the raw client action, so it can't be spoofed by a bad client roll alone.
 */
public class RngDiffProcessor implements Processor<String, String, String, String> {

    private static final int FAIL_STREAK_THRESHOLD = 3;

    private KeyValueStore<String, String> streakStore;
    private ProcessorContext<String, String> context;

    @Override
    public void init(ProcessorContext<String, String> context) {
        this.context = context;
        this.streakStore = context.getStateStore(GameMonitoringStreamsProcessor.RNG_STREAK_STORE_NAME);
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
        if (inner == null) return;
        if (!"animation".equals(inner.optString("type"))) return;

        String subtype = inner.optString("subtype", null);
        JSONObject payload = inner.optJSONObject("payload");
        if (subtype == null || payload == null) return;
        if (!"monster_slain".equals(subtype) && !"monster_fight_back".equals(subtype) && !"monster_survives".equals(subtype)) return;

        String playerId = payload.optString("playerId", null);
        if (playerId == null) return;

        String matchId = record.key();
        String storeKey = matchId + "|" + playerId;

        if ("monster_slain".equals(subtype)) {
            streakStore.put(storeKey, "0");
            return;
        }

        int streak = parseCount(streakStore.get(storeKey)) + 1;

        if (streak >= FAIL_STREAK_THRESHOLD) {
            streakStore.put(storeKey, "0");
            context.forward(new Record<>(matchId, MonitoringAlert.rngDiff(playerId, streak), record.timestamp()));
        } else {
            streakStore.put(storeKey, String.valueOf(streak));
        }
    }

    private static int parseCount(String raw) {
        if (raw == null) return 0;
        try {
            return Integer.parseInt(raw);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
