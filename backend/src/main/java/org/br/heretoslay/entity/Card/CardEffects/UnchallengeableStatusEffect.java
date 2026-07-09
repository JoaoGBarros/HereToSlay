package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

public class UnchallengeableStatusEffect implements CardEffect {

    public enum Scope { ALL_CARDS_REST_OF_TURN, ITEMS_PERMANENT }

    private final Scope scope;

    public UnchallengeableStatusEffect(Scope scope) {
        this.scope = scope;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        if (scope == Scope.ITEMS_PERMANENT) {
            gameState.setItemsPermanentlyUnchallengeable(true);
        } else {
            gameState.setCardsUnchallengeableThisTurn(true);
        }
    }
}
