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
 * queues it up to be "used" right away, the same as if the player had
 * dragged/clicked it themselves: Match's apply_card_effects handler notices
 * gameState's pendingHeroCard changed to this freshly-stolen card and
 * transitions to WAITING_HERO_ROLL for it, so the stolen hero gets the same
 * real dice-roll UI as any other used hero. See Wiggles.
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

        stolenHero.ifPresent(gameState::setPendingHeroCard);
    }
}
