package org.br.heretoslay.engine;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The summary of a finished match that the accounts API turns into player stats and history
 * (published on the match-results topic).
 *
 * <p>Final positions: the winner is 1st. Players still at the table come next, ranked by distinct
 * classes in their party, then monsters slain, then heroes. Players who left come last, the later
 * they left the better.
 */
public final class MatchResult {

    private static final Map<String, String> WIN_CONDITIONS = Map.of(
            "classes", "CLASSES",
            "monsters", "MONSTERS",
            "last_standing", "LAST_STANDING");

    private static final Comparator<PlayerState> STILL_PLAYING = Comparator
            .comparingInt(PlayerState::finalClassCount)
            .thenComparingInt(PlayerState::getMonstersSlain)
            .thenComparingInt(PlayerState::finalHeroCount)
            .reversed();

    private static final Comparator<PlayerState> LEFT_EARLY = Comparator
            .comparing(PlayerState::getLeftAt, Comparator.nullsLast(Comparator.naturalOrder()))
            .reversed();

    private MatchResult() {
    }

    public static JSONObject build(UUID resultId, Long engineMatchId, long startedAt, long finishedAt,
                                   String winnerId, String reason, Collection<PlayerState> players) {
        JSONArray standings = new JSONArray();
        List<PlayerState> ordered = rank(winnerId, players);
        for (int i = 0; i < ordered.size(); i++) {
            standings.put(toJson(ordered.get(i), i + 1));
        }
        return new JSONObject()
                .put("matchId", resultId.toString())
                .put("engineMatchId", engineMatchId)
                .put("startedAt", Instant.ofEpochMilli(startedAt).toString())
                .put("finishedAt", Instant.ofEpochMilli(finishedAt).toString())
                .put("winCondition", WIN_CONDITIONS.getOrDefault(reason, "LAST_STANDING"))
                .put("winnerId", winnerId)
                .put("players", standings);
    }

    private static List<PlayerState> rank(String winnerId, Collection<PlayerState> players) {
        List<PlayerState> ordered = new ArrayList<>();
        players.stream().filter(p -> p.getId().equals(winnerId)).forEach(ordered::add);
        players.stream().filter(p -> !p.getId().equals(winnerId) && !p.isGone()).sorted(STILL_PLAYING).forEach(ordered::add);
        players.stream().filter(p -> !p.getId().equals(winnerId) && p.isGone()).sorted(LEFT_EARLY).forEach(ordered::add);
        return ordered;
    }

    private static JSONObject toJson(PlayerState p, int position) {
        return new JSONObject()
                .put("playerId", p.getId())
                .put("username", p.getUsername())
                .put("position", position)
                .put("partyLeader", p.getLeader() == null ? JSONObject.NULL : p.getLeader().name())
                .put("heroesInParty", p.finalHeroCount())
                .put("classesInParty", p.finalClassCount())
                .put("monstersSlain", p.getMonstersSlain())
                .put("leftReason", p.isGone() ? p.getLeftReason() : JSONObject.NULL)
                .put("leftAt", p.getLeftAt() == null ? JSONObject.NULL : Instant.ofEpochMilli(p.getLeftAt()).toString());
    }
}
