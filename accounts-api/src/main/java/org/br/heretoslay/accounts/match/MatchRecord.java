package org.br.heretoslay.accounts.match;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import org.br.heretoslay.accounts.match.event.MatchResultEvent;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** A finished match. Written once from the engine's result and never changed. */
@Entity
@Table(name = "matches")
public class MatchRecord {

    @Id
    private UUID id;

    /** The table number the engine used; it can repeat across server restarts, the id does not. */
    @Column(name = "engine_match_id", nullable = false, updatable = false)
    private long engineMatchId;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    @Column(name = "finished_at", nullable = false, updatable = false)
    private Instant finishedAt;

    @Column(name = "duration_seconds", nullable = false, updatable = false)
    private long durationSeconds;

    @Enumerated(EnumType.STRING)
    @Column(name = "win_condition", nullable = false, updatable = false, length = 16)
    private WinCondition winCondition;

    @Column(name = "winner_username", nullable = false, updatable = false, length = 20)
    private String winnerUsername;

    @Column(name = "player_count", nullable = false, updatable = false)
    private int playerCount;

    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<MatchParticipant> participants = new ArrayList<>();

    protected MatchRecord() {
    }

    public static MatchRecord from(MatchResultEvent event, String winnerUsername) {
        MatchRecord match = new MatchRecord();
        match.id = event.matchId();
        match.engineMatchId = event.engineMatchId();
        match.startedAt = event.startedAt();
        match.finishedAt = event.finishedAt();
        match.durationSeconds = Duration.between(event.startedAt(), event.finishedAt()).toSeconds();
        match.winCondition = event.winCondition();
        match.winnerUsername = winnerUsername;
        match.playerCount = event.players().size();
        return match;
    }

    void addParticipant(MatchParticipant participant) {
        participants.add(participant);
    }

    public UUID getId() { return id; }
    public long getEngineMatchId() { return engineMatchId; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getFinishedAt() { return finishedAt; }
    public long getDurationSeconds() { return durationSeconds; }
    public WinCondition getWinCondition() { return winCondition; }
    public String getWinnerUsername() { return winnerUsername; }
    public int getPlayerCount() { return playerCount; }
    public List<MatchParticipant> getParticipants() { return List.copyOf(participants); }
}
