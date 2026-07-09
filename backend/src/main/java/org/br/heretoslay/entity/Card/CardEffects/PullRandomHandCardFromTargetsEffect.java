package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Companion for a StealCardEffect/StealHandEffect that also pulls a random
 * hand card from the same target(s). Must run BEFORE the paired effect in a
 * CompositeCardEffect list, since both clear their own target map once applied.
 */
public class PullRandomHandCardFromTargetsEffect implements CardEffect {

    private final Supplier<Map<String, List<Long>>> targetMapSupplier;

    public PullRandomHandCardFromTargetsEffect(StealCardEffect sourceOfTargets) {
        this.targetMapSupplier = sourceOfTargets::getPlayerIdToCardId;
    }

    public PullRandomHandCardFromTargetsEffect(StealHandEffect sourceOfTargets) {
        this.targetMapSupplier = sourceOfTargets::getPlayerIdToCardId;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        for (String playerId : targetMapSupplier.get().keySet()) {
            match.getPlayers().values().stream()
                    .filter(gs -> UUID.nameUUIDFromBytes(gs.getUsername().getBytes()).toString().equals(playerId))
                    .findFirst()
                    .ifPresent(target -> {
                        if (!target.getHand().isEmpty()) {
                            Card pulled = target.getHand().get(new Random().nextInt(target.getHand().size()));
                            target.getHand().remove(pulled);
                            gameState.getHand().add(pulled);
                        }
                    });
        }
    }
}
