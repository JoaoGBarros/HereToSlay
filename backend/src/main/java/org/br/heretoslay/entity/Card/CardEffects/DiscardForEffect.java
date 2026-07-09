package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Discards up to maxCount cards from the caster's hand, then unlocks one
 * DestroyCardEffect target per card discarded. Needs to run before the
 * party-target-selection window opens (maxDestroy must be known up front),
 * so Match.processHeroDiceRoll calls resolveDiscard() eagerly instead of
 * relying on the normal (later) CardEffect.applyEffect pass.
 */
public class DiscardForEffect implements CardEffect {

    private final int maxCount;
    private final DestroyCardEffect pairedDestroyEffect;

    public DiscardForEffect(int maxCount, DestroyCardEffect pairedDestroyEffect) {
        this.maxCount = maxCount;
        this.pairedDestroyEffect = pairedDestroyEffect;
    }

    public int getMaxCount() {
        return maxCount;
    }

    public int resolveDiscard(Match match, GameState gameState) {
        List<Card> hand = gameState.getHand();
        List<Card> shuffled = new ArrayList<>(hand);
        Collections.shuffle(shuffled);

        int toDiscard = Math.min(maxCount, shuffled.size());
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
        pairedDestroyEffect.setMaxDestroy(toDiscard);
        return toDiscard;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
    }
}
