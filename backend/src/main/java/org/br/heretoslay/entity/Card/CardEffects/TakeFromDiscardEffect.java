package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Moves up to count random cards from the discard pile into the caster's
 * hand. Used for effects like Beary Wise, where the discarded cards go into a
 * shared pool the caster then picks from - picking at random is an MVP
 * simplification.
 */
public class TakeFromDiscardEffect implements CardEffect {

    private final int count;

    public TakeFromDiscardEffect(int count) {
        this.count = count;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        List<Card> discardPile = match.getDiscardPile();
        List<Card> shuffled = new ArrayList<>(discardPile);
        Collections.shuffle(shuffled);

        int toTake = Math.min(count, shuffled.size());
        for (int i = 0; i < toTake; i++) {
            Card card = shuffled.get(i);
            discardPile.remove(card);
            gameState.getHand().add(card);
        }
    }
}
