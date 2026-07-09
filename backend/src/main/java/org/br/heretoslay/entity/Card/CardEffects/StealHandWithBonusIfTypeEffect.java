package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.Card.CardType;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

/**
 * Pulls a card from another player's hand (delegates to a StealHandEffect the
 * player already picked a specific card for), then - if that pulled card is
 * of bonusIfType - pulls one more random card from the same target's hand.
 */
public class StealHandWithBonusIfTypeEffect implements CardEffect {

    private final StealHandEffect primary;
    private final CardType bonusIfType;

    public StealHandWithBonusIfTypeEffect(StealHandEffect primary, CardType bonusIfType) {
        this.primary = primary;
        this.bonusIfType = bonusIfType;
    }

    public StealHandEffect getPrimary() {
        return primary;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        Map<String, List<Long>> targets = primary.getPlayerIdToCardId();
        Map.Entry<String, List<Long>> firstEntry = targets.entrySet().stream().findFirst().orElse(null);
        String targetPlayerId = firstEntry == null ? null : firstEntry.getKey();

        GameState targetState = targetPlayerId == null ? null : match.getPlayers().values().stream()
                .filter(gs -> UUID.nameUUIDFromBytes(gs.getUsername().getBytes()).toString().equals(targetPlayerId))
                .findFirst()
                .orElse(null);

        boolean qualifiesForBonus = targetState != null && firstEntry.getValue().stream().anyMatch(cardId ->
                targetState.getHand().stream().anyMatch(c -> c.getCardId().equals(cardId) && c.getType() == bonusIfType));

        primary.applyEffect(match, gameState);

        if (qualifiesForBonus && !targetState.getHand().isEmpty()) {
            Card pulled = targetState.getHand().get(new Random().nextInt(targetState.getHand().size()));
            targetState.getHand().remove(pulled);
            gameState.getHand().add(pulled);
        }
    }
}
