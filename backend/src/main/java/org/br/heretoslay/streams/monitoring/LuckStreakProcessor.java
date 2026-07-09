package org.br.heretoslay.streams.monitoring;

import org.apache.kafka.streams.processor.api.Processor;
import org.apache.kafka.streams.processor.api.ProcessorContext;
import org.apache.kafka.streams.processor.api.Record;
import org.apache.kafka.streams.state.KeyValueIterator;
import org.apache.kafka.streams.state.KeyValueStore;
import org.json.JSONObject;

/**
 * Statefull piece of Situação 3 (Reviravolta de Sorte): tracks each player's
 * current luck streak (StreakInterval) in a state store and, whenever a
 * streak just closed (the player's fortune flipped), classifies its Allen
 * relation against every other still-open streak in the same match. Only
 * genuinely overlapping relations (see AllenRelation.isNoteworthy) produce
 * an alert - see GameMonitoringStreamsProcessor for how this is wired in.
 */
public class LuckStreakProcessor implements Processor<String, String, String, String> {

    private static final int HOT_THRESHOLD = 6;

    private KeyValueStore<String, String> streakStore;
    private ProcessorContext<String, String> context;

    @Override
    public void init(ProcessorContext<String, String> context) {
        this.context = context;
        this.streakStore = context.getStateStore(GameMonitoringStreamsProcessor.STREAK_STORE_NAME);
    }

    @Override
    public void process(Record<String, String> record) {
        JSONObject action;
        try {
            action = new JSONObject(record.value());
        } catch (Exception e) {
            return;
        }
        if (!"process_hero_roll".equals(action.optString("action"))) return;

        String playerId = action.optString("playerId", null);
        JSONObject payload = action.optJSONObject("payload");
        if (playerId == null || payload == null || !payload.has("roll")) return;

        String matchId = record.key();
        int roll = payload.optInt("roll", -1);
        boolean success = roll >= HOT_THRESHOLD;

        StreakInterval previous = StreakInterval.fromJson(streakStore.get(playerId));
        StreakInterval.Update update = StreakInterval.update(previous, matchId, playerId, success, record.timestamp());
        streakStore.put(playerId, update.current().toJson());

        if (update.justClosed() == null) return;
        StreakInterval closed = update.justClosed();

        try (KeyValueIterator<String, String> all = streakStore.all()) {
            while (all.hasNext()) {
                var entry = all.next();
                if (entry.key.equals(playerId)) continue;
                StreakInterval rival = StreakInterval.fromJson(entry.value);
                if (rival == null || !rival.getMatchId().equals(matchId)) continue;
                if (!rival.isOpenAndOpposite(closed)) continue;

                AllenRelation relation = AllenRelation.classify(closed, rival);
                if (relation.isNoteworthy()) {
                    context.forward(new Record<>(matchId,
                            MonitoringAlert.turningPoint(playerId, rival.getPlayerId(), relation.name()),
                            record.timestamp()));
                }
            }
        }
    }
}
