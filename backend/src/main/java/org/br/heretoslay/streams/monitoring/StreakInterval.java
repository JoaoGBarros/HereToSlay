package org.br.heretoslay.streams.monitoring;

import org.json.JSONObject;

/**
 * A player's current run of hero-roll successes (HOT) or failures (COLD),
 * represented as a half-open interval [start, end). "Success" here is a
 * simplification: roll >= HOT_THRESHOLD, since the monitoring service only
 * sees game-actions-in and not the hero-specific minValue used by the real
 * engine - good enough for an illustrative trend, not exact game logic.
 */
public class StreakInterval {

    public enum Type { HOT, COLD }

    private final String matchId;
    private final String playerId;
    private final Type type;
    private final long start;
    private long end;
    private boolean open;

    public StreakInterval(String matchId, String playerId, Type type, long start, long end, boolean open) {
        this.matchId = matchId;
        this.playerId = playerId;
        this.type = type;
        this.start = start;
        this.end = end;
        this.open = open;
    }

    public static StreakInterval.Update update(StreakInterval previous, String matchId, String playerId, boolean success, long timestamp) {
        Type newType = success ? Type.HOT : Type.COLD;

        if (previous == null || previous.type != newType) {
            StreakInterval closed = previous;
            if (closed != null) {
                closed.open = false;
            }
            StreakInterval fresh = new StreakInterval(matchId, playerId, newType, timestamp, timestamp, true);
            return new Update(fresh, closed);
        }

        previous.end = timestamp;
        return new Update(previous, null);
    }

    public record Update(StreakInterval current, StreakInterval justClosed) {
    }

    public boolean isOpenAndOpposite(StreakInterval other) {
        return this.open && this.type != other.type;
    }

    public String getMatchId() {
        return matchId;
    }

    public String getPlayerId() {
        return playerId;
    }

    public long getStart() {
        return start;
    }

    public long getEnd() {
        return end;
    }

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
