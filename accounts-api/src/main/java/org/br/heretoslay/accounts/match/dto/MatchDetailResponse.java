package org.br.heretoslay.accounts.match.dto;

import org.br.heretoslay.accounts.match.MatchParticipant;
import org.br.heretoslay.accounts.match.MatchRecord;
import org.br.heretoslay.accounts.match.WinCondition;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** A finished match with every player's final position. */
public record MatchDetailResponse(
        UUID id,
        Instant startedAt,
        Instant finishedAt,
        long durationSeconds,
        WinCondition winCondition,
        String winnerUsername,
        int playerCount,
        List<Participant> participants) {

    public record Participant(
            String username,
            int position,
            String partyLeader,
            int heroesInParty,
            int classesInParty,
            int monstersSlain,
            String leftReason,
            Instant leftAt) {

        static Participant from(MatchParticipant participant) {
            return new Participant(participant.getUsername(), participant.getPosition(),
                    participant.getPartyLeader(), participant.getHeroesInParty(), participant.getClassesInParty(),
                    participant.getMonstersSlain(), participant.getLeftReason(), participant.getLeftAt());
        }
    }

    public static MatchDetailResponse from(MatchRecord match) {
        return new MatchDetailResponse(match.getId(), match.getStartedAt(), match.getFinishedAt(),
                match.getDurationSeconds(), match.getWinCondition(), match.getWinnerUsername(),
                match.getPlayerCount(), match.getParticipants().stream().map(Participant::from).toList());
    }
}
