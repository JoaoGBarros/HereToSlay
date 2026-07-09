package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

/**
 * Looks at the top revealCount cards of the draw pile, keeps keepCount of them
 * (added to hand) and returns the rest to the top of the draw pile. The
 * physical game lets the player choose which to keep and the return order;
 * here the first keepCount revealed cards are kept as an MVP simplification.
 */
public class ScryEffect implements CardEffect {

    private final int revealCount;
    private final int keepCount;

    public ScryEffect(int revealCount, int keepCount) {
        this.revealCount = revealCount;
        this.keepCount = keepCount;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        match.scryTop(revealCount, keepCount, gameState);
    }
}
