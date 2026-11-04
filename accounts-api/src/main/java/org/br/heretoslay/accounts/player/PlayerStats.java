package org.br.heretoslay.accounts.player;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** A player's lifetime totals, updated once per finished match. */
@Embeddable
public class PlayerStats {

    @Column(name = "matches_played", nullable = false)
    private int matchesPlayed;

    @Column(nullable = false)
    private int wins;

    @Column(nullable = false)
    private int losses;

    @Column(name = "wins_by_classes", nullable = false)
    private int winsByClasses;

    @Column(name = "wins_by_monsters", nullable = false)
    private int winsByMonsters;

    @Column(name = "monsters_slain_total", nullable = false)
    private int monstersSlainTotal;

    protected PlayerStats() {
    }

    public static PlayerStats empty() {
        return new PlayerStats();
    }

    /**
     * Adds one match. Classes and monsters wins are counted apart; winning because everyone else
     * left only counts as a win.
     */
    void record(MatchOutcome outcome) {
        matchesPlayed++;
        monstersSlainTotal += outcome.monstersSlain();
        if (!outcome.won()) {
            losses++;
            return;
        }
        wins++;
        switch (outcome.winCondition()) {
            case CLASSES -> winsByClasses++;
            case MONSTERS -> winsByMonsters++;
            case LAST_STANDING -> { }
        }
    }

    public int getMatchesPlayed() { return matchesPlayed; }
    public int getWins() { return wins; }
    public int getLosses() { return losses; }
    public int getWinsByClasses() { return winsByClasses; }
    public int getWinsByMonsters() { return winsByMonsters; }
    public int getMonstersSlainTotal() { return monstersSlainTotal; }
}
