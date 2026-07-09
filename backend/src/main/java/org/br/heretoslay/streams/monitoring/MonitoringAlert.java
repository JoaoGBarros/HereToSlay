package org.br.heretoslay.streams.monitoring;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Builds the wire payload for every situation the monitoring service detects.
 * targetPlayers is always the sentinel "MATCH_ALL" - the Gateway resolves it
 * to the real player ids for the match (the Kafka record key) by consulting
 * its own match-state-store cache, the same way MatchService already resolves
 * targetPlayers for game-state-out.
 */
public class MonitoringAlert {

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

    public static String actionHistory(JSONArray history) {
        JSONObject extra = new JSONObject().put("history", history);
        return wrap("ACTION_HISTORY", "Action history updated", extra);
    }

    public static String focusedTarget(String targetPlayerId, long attackCount) {
        JSONObject extra = new JSONObject().put("targetPlayerId", targetPlayerId).put("attackCount", attackCount);
        return wrap("FOCUSED_TARGET", "🎯 Attacks are piling up on " + targetPlayerId + "!", extra);
    }

    public static String turningPoint(String playerA, String playerB, String relation) {
        JSONObject extra = new JSONObject().put("playerA", playerA).put("playerB", playerB).put("relation", relation);
        return wrap("TURNING_POINT", "🔄 Luck just turned between two players!", extra);
    }

    public static String chainReaction(long actionCount) {
        JSONObject extra = new JSONObject().put("actionCount", actionCount);
        return wrap("CHAIN_REACTION", "⚡ Chain reaction! Several actions resolved back to back", extra);
    }

    // ---- Temporary behavior tags (playful CEP situations, item 9) ----
    // Each carries taggedPlayerId + tagType in extra so the frontend can show
    // a small badge next to that player, on top of the usual toast for everyone.

    public static String frequentBuyer(String playerId, int drawStreak) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", playerId)
                .put("tagType", "FREQUENT_BUYER")
                .put("drawStreak", drawStreak);
        return wrap("FREQUENT_BUYER", "🛒 Someone just drew cards " + drawStreak + " times in a row - tagged Frequent Buyer!", extra);
    }

    public static String focusing(String attackerId, String targetId, long targetCount) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", attackerId)
                .put("tagType", "FOCUSING")
                .put("targetId", targetId)
                .put("targetCount", targetCount);
        return wrap("FOCUSING", "🔎 A player keeps targeting the same rival - tagged Focusing!", extra);
    }

    public static String focused(String targetId, String attackerId) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", targetId)
                .put("tagType", "FOCUSED")
                .put("byPlayerId", attackerId);
        return wrap("FOCUSED", "🎯 A player is getting singled out - tagged Focused!", extra);
    }

    public static String rngDiff(String playerId, long failStreak) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", playerId)
                .put("tagType", "RNG_DIFF")
                .put("failStreak", failStreak);
        return wrap("RNG_DIFF", "🎲 The dice have not been kind lately - tagged RNG Diff!", extra);
    }

    public static String firstBlood(String playerId) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", playerId)
                .put("tagType", "FIRST_BLOOD");
        return wrap("FIRST_BLOOD", "🩸 First blood! A monster has fallen - tagged First Blood!", extra);
    }

    public static String combo(String playerId, long actionCount) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", playerId)
                .put("tagType", "COMBO")
                .put("actionCount", actionCount);
        return wrap("COMBO", "🔥 Quick hands! A player is on a combo - tagged Combo!", extra);
    }

    public static String generousSoul(String playerId) {
        JSONObject extra = new JSONObject()
                .put("taggedPlayerId", playerId)
                .put("tagType", "GENEROUS_SOUL");
        return wrap("GENEROUS_SOUL", "💝 What a generous soul - buffed a rival! Tagged Generous Soul!", extra);
    }
}
