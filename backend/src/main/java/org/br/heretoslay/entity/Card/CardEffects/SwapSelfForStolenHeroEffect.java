package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Steals a chosen hero (delegates target selection to a StealCardEffect),
 * then moves the card currently being used (gameState.getPendingHeroCard(),
 * still set at this point in Match.performAction's apply_card_effects step)
 * into the target's party - e.g. Tipsy Tootie.
 */
public class SwapSelfForStolenHeroEffect implements CardEffect {

    private final StealCardEffect primary;

    public SwapSelfForStolenHeroEffect(StealCardEffect primary) {
        this.primary = primary;
    }

    public StealCardEffect getPrimary() {
        return primary;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        Map<String, List<Long>> targets = primary.getPlayerIdToCardId();
        Map.Entry<String, List<Long>> firstEntry = targets.entrySet().stream().findFirst().orElse(null);
        GameState targetState = firstEntry == null ? null : match.getPlayers().values().stream()
                .filter(gs -> UUID.nameUUIDFromBytes(gs.getUsername().getBytes()).toString().equals(firstEntry.getKey()))
                .findFirst()
                .orElse(null);

        Card self = gameState.getPendingHeroCard();

        primary.applyEffect(match, gameState);

        if (targetState != null && self != null) {
            gameState.getParty().remove(self);
            targetState.getParty().add(self);
        }
    }
}
