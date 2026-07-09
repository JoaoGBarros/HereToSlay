package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.Card.CardType;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.List;
import java.util.Optional;

/**
 * Searches the discard pile for a card of the given type and adds it to hand.
 * The physical game lets the player pick among matches; with the discard pile
 * order preserved here, the first match found is taken as an MVP simplification.
 */
public class SearchDiscardEffect implements CardEffect {

    private final CardType cardType;

    public SearchDiscardEffect(CardType cardType) {
        this.cardType = cardType;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        List<Card> discardPile = match.getDiscardPile();
        Optional<Card> found = discardPile.stream().filter(c -> c.getType() == cardType).findFirst();
        found.ifPresent(card -> {
            discardPile.remove(card);
            gameState.getHand().add(card);
        });
    }
}
