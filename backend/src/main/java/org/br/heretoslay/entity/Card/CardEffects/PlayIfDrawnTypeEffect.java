package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.Card.CardType;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.List;

/**
 * If the most recently drawn/pulled card is of requiredType, plays it
 * immediately (bypassing the challenge window - see Match.playCardImmediately).
 * The physical game makes this optional ("you may"); it is always taken here
 * as an MVP simplification, since there is no extra prompt round-trip for it.
 */
public class PlayIfDrawnTypeEffect implements CardEffect {

    private final CardType requiredType;

    public PlayIfDrawnTypeEffect(CardType requiredType) {
        this.requiredType = requiredType;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        List<Card> drawn = gameState.getLastDrawnCards();
        if (drawn.isEmpty()) return;
        Card last = drawn.get(drawn.size() - 1);
        if (last.getType() == requiredType) {
            match.playCardImmediately(gameState, last);
        }
    }
}
