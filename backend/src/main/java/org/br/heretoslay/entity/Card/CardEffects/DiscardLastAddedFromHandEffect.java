package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.json.JSONObject;

import java.util.List;

/**
 * Discards the count most-recently-added cards in the caster's hand (e.g.
 * Slippery Paws: pull 2, then discard one of those same two).
 */
public class DiscardLastAddedFromHandEffect implements CardEffect {

    private final int count;

    public DiscardLastAddedFromHandEffect(int count) {
        this.count = count;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        List<Card> hand = gameState.getHand();
        int toDiscard = Math.min(count, hand.size());
        String targetPlayerId = match.getPlayerId(gameState);
        for (int i = 0; i < toDiscard; i++) {
            Card last = hand.remove(hand.size() - 1);
            match.getDiscardPile().add(last);

            JSONObject animation = new JSONObject();
            animation.put("type", "animation");
            animation.put("subtype", "discard_card");
            animation.put("payload", new JSONObject()
                    .put("targetPlayerId", targetPlayerId)
                    .put("cardId", last.getCardId())
            );
            match.broadcast(animation.toString());
        }
    }
}
