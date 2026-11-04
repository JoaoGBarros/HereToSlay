package org.br.heretoslay.accounts.player;

import org.br.heretoslay.accounts.match.WinCondition;

/** How one finished match went for one player, as far as their lifetime stats care. */
public record MatchOutcome(boolean won, WinCondition winCondition, int monstersSlain) {
}
