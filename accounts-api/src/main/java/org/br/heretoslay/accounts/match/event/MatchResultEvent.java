package org.br.heretoslay.accounts.match.event;

import org.br.heretoslay.accounts.match.WinCondition;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * What the game engine publishes on the match-results topic when a match ends. Player ids are
 * Firebase uids. It comes from another service, so it is checked before anything is stored.
 */
public record MatchResultEvent(
        UUID matchId,
        long engineMatchId,
        Instant startedAt,
        Instant finishedAt,
        WinCondition winCondition,
        String winnerId,
        List<ParticipantResult> players) {

    public record ParticipantResult(
            String playerId,
            String username,
            int position,
            String partyLeader,
            int heroesInParty,
            int classesInParty,
            int monstersSlain,
            String leftReason,
            Instant leftAt) {

        boolean isValid(int playerCount) {
            return playerId != null && !playerId.isBlank()
                    && username != null && !username.isBlank()
                    && position >= 1 && position <= playerCount
                    && heroesInParty >= 0 && classesInParty >= 0 && monstersSlain >= 0;
        }
    }

    /** Whether the event is complete and consistent enough to be recorded. */
    public boolean isValid() {
        if (matchId == null || startedAt == null || finishedAt == null || winCondition == null
                || winnerId == null || players == null || players.size() < 2
                || finishedAt.isBefore(startedAt)) {
            return false;
        }
        Set<String> ids = new HashSet<>();
        Set<Integer> positions = new HashSet<>();
        for (ParticipantResult player : players) {
            if (player == null || !player.isValid(players.size())
                    || !ids.add(player.playerId()) || !positions.add(player.position())) {
                return false;
            }
        }
        return players.stream().anyMatch(p -> Objects.equals(p.playerId(), winnerId) && p.position() == 1);
    }
}
