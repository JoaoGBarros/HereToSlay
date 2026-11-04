package org.br.heretoslay.accounts.match;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.br.heretoslay.accounts.match.event.MatchResultEvent.ParticipantResult;
import org.br.heretoslay.accounts.player.Player;

import java.time.Instant;

/**
 * One player's line in a finished match. The username is copied at the time of the match, and the
 * player link stays empty if the account no longer exists.
 */
@Entity
@Table(name = "match_participants")
public class MatchParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false, updatable = false)
    private MatchRecord match;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", updatable = false)
    private Player player;

    @Column(nullable = false, updatable = false, length = 20)
    private String username;

    @Column(nullable = false, updatable = false)
    private int position;

    @Column(name = "party_leader", updatable = false, length = 32)
    private String partyLeader;

    @Column(name = "heroes_in_party", nullable = false, updatable = false)
    private int heroesInParty;

    @Column(name = "classes_in_party", nullable = false, updatable = false)
    private int classesInParty;

    @Column(name = "monsters_slain", nullable = false, updatable = false)
    private int monstersSlain;

    /** Why the player left before the end (surrender, disconnect, did not load), if they did. */
    @Column(name = "left_reason", updatable = false, length = 32)
    private String leftReason;

    @Column(name = "left_at", updatable = false)
    private Instant leftAt;

    protected MatchParticipant() {
    }

    static MatchParticipant of(MatchRecord match, Player player, ParticipantResult result) {
        MatchParticipant participant = new MatchParticipant();
        participant.match = match;
        participant.player = player;
        participant.username = player != null ? player.getUsername() : result.username();
        participant.position = result.position();
        participant.partyLeader = result.partyLeader();
        participant.heroesInParty = result.heroesInParty();
        participant.classesInParty = result.classesInParty();
        participant.monstersSlain = result.monstersSlain();
        participant.leftReason = result.leftReason();
        participant.leftAt = result.leftAt();
        return participant;
    }

    public MatchRecord getMatch() { return match; }
    public String getUsername() { return username; }
    public int getPosition() { return position; }
    public String getPartyLeader() { return partyLeader; }
    public int getHeroesInParty() { return heroesInParty; }
    public int getClassesInParty() { return classesInParty; }
    public int getMonstersSlain() { return monstersSlain; }
    public String getLeftReason() { return leftReason; }
    public Instant getLeftAt() { return leftAt; }
    public boolean isWinner() { return position == 1; }
}
