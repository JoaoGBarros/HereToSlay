package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class DiscardEffect implements CardEffect {

    private final int count;

    public DiscardEffect(int count) {
        this.count = count;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        List<Card> hand = gameState.getHand();
        List<Card> shuffled = new ArrayList<>(hand);
        Collections.shuffle(shuffled);

        int toDiscard = Math.min(count, shuffled.size());
        String targetPlayerId = match.getPlayerId(gameState);
        for (int i = 0; i < toDiscard; i++) {
            Card card = shuffled.get(i);
            hand.remove(card);
            match.getDiscardPile().add(card);

            JSONObject animation = new JSONObject();
            animation.put("type", "animation");
            animation.put("subtype", "discard_card");
            animation.put("payload", new JSONObject()
                    .put("targetPlayerId", targetPlayerId)
                    .put("cardId", card.getCardId())
            );
            match.broadcast(animation.toString());
        }
    }
}
