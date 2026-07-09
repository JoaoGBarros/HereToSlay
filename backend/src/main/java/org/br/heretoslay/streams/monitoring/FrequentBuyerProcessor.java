package org.br.heretoslay.streams.monitoring;

import org.apache.kafka.streams.processor.api.Processor;
import org.apache.kafka.streams.processor.api.ProcessorContext;
import org.apache.kafka.streams.processor.api.Record;
import org.apache.kafka.streams.state.KeyValueStore;
import org.json.JSONObject;

/**
 * "Frequent Buyer" tag (item 9): tracks each player's current streak of
 * consecutive draw_card actions (no other action interleaved) in a state
 * store. Reaching the threshold - roughly two full turns spent doing
 * nothing but drawing - fires the tag and resets the streak, so it can fire
 * again for a fresh run instead of spamming every subsequent draw.
 *
 * Easy manual test: as a single player with no other action in between,
 * send draw_card 6 times in a row.
 */
public class FrequentBuyerProcessor implements Processor<String, String, String, String> {

    private static final int DRAW_STREAK_THRESHOLD = 6;

    private KeyValueStore<String, String> streakStore;
    private ProcessorContext<String, String> context;

    @Override
    public void init(ProcessorContext<String, String> context) {
        this.context = context;
        this.streakStore = context.getStateStore(GameMonitoringStreamsProcessor.BUYER_STREAK_STORE_NAME);
    }

    @Override
    public void process(Record<String, String> record) {
        JSONObject action;
        try {
            action = new JSONObject(record.value());
        } catch (Exception e) {
            return;
        }

        String playerId = action.optString("playerId", null);
        String actionName = action.optString("action", null);
        if (playerId == null || actionName == null) return;

        String matchId = record.key();
        String storeKey = matchId + "|" + playerId;

        if (!"draw_card".equals(actionName)) {
            streakStore.put(storeKey, "0");
            return;
        }

        int streak = parseCount(streakStore.get(storeKey)) + 1;

        if (streak >= DRAW_STREAK_THRESHOLD) {
            streakStore.put(storeKey, "0");
            context.forward(new Record<>(matchId, MonitoringAlert.frequentBuyer(playerId, streak), record.timestamp()));
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
