package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.Card.CardType;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.List;

/**
 * If the most recently added hand card (typically just pulled from another
 * player) is of requiredType, plays it immediately. See Match.playCardImmediately.
 */
public class PlayLastHandCardIfTypeEffect implements CardEffect {

    private final CardType requiredType;

    public PlayLastHandCardIfTypeEffect(CardType requiredType) {
        this.requiredType = requiredType;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        List<Card> hand = gameState.getHand();
        if (hand.isEmpty()) return;
        Card last = hand.get(hand.size() - 1);
        if (last.getType() == requiredType) {
            match.playCardImmediately(gameState, last);
        }
    }
}
