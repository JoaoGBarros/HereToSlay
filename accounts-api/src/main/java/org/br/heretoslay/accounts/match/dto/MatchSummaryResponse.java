package org.br.heretoslay.accounts.match.dto;

import org.br.heretoslay.accounts.match.MatchParticipant;
import org.br.heretoslay.accounts.match.MatchRecord;
import org.br.heretoslay.accounts.match.WinCondition;

import java.time.Instant;
import java.util.UUID;

/** One line of a player's match history: the match, and how that player did in it. */
public record MatchSummaryResponse(
        UUID matchId,
        Instant startedAt,
        Instant finishedAt,
        long durationSeconds,
        WinCondition winCondition,
        String winnerUsername,
        int playerCount,
        int position,
        boolean won,
        String partyLeader,
        int monstersSlain,
        int classesInParty) {

    public static MatchSummaryResponse from(MatchParticipant participant) {
        MatchRecord match = participant.getMatch();
        return new MatchSummaryResponse(match.getId(), match.getStartedAt(), match.getFinishedAt(),
                match.getDurationSeconds(), match.getWinCondition(), match.getWinnerUsername(),
                match.getPlayerCount(), participant.getPosition(), participant.isWinner(),
                participant.getPartyLeader(), participant.getMonstersSlain(), participant.getClassesInParty());
    }
}
