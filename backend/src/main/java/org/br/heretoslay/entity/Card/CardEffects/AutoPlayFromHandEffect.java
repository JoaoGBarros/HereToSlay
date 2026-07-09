package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.Card.CardType;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

/**
 * Plays the first card of requiredType found in hand, immediately (bypassing
 * the challenge window for heroes - see Match.playCardImmediately). The
 * physical game lets the player choose which copy; picking the first one
 * found is an MVP simplification when more than one qualifies.
 */
public class AutoPlayFromHandEffect implements CardEffect {

    private final CardType requiredType;

    public AutoPlayFromHandEffect(CardType requiredType) {
        this.requiredType = requiredType;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        gameState.getHand().stream()
                .filter(c -> c.getType() == requiredType)
                .findFirst()
                .ifPresent(card -> match.playCardImmediately(gameState, card));
    }
}
