package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.Card.CardType;
import org.br.heretoslay.entity.Card.HeroCard;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.Optional;

/**
 * Steals a chosen hero (delegates target selection to a StealCardEffect) and
 * immediately applies its effect - the physical "roll to use it" step is
 * skipped (treated as an automatic success) as an MVP simplification, since
 * chaining a second real dice roll inside this effect resolution would need
 * new state-machine plumbing. See Wiggles.
 */
public class StealAndUseEffectImmediatelyEffect implements CardEffect {

    private final StealCardEffect primary;

    public StealAndUseEffectImmediatelyEffect(StealCardEffect primary) {
        this.primary = primary;
    }

    public StealCardEffect getPrimary() {
        return primary;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        primary.applyEffect(match, gameState);

        Optional<Card> stolenHero = gameState.getParty().stream()
                .filter(c -> c.getType() == CardType.HERO)
                .reduce((first, second) -> second);

        stolenHero.ifPresent(card -> ((HeroCard) card).applyEffect(match, gameState));
    }
}
