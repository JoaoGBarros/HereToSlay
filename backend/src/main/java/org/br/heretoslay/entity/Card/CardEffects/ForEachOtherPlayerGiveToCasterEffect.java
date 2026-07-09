package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.Random;
import java.util.function.Predicate;

/**
 * Every other player matching filter gives up one random card from their
 * hand to the caster (e.g. Greedy Cheeks - no filter; Smooth Mimimeow -
 * filter by hero class in party).
 */
public class ForEachOtherPlayerGiveToCasterEffect implements CardEffect {

    private final Predicate<GameState> filter;

    public ForEachOtherPlayerGiveToCasterEffect(Predicate<GameState> filter) {
        this.filter = filter;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        for (GameState other : match.getPlayers().values()) {
            if (other == gameState || !filter.test(other) || other.getHand().isEmpty()) continue;
            Card given = other.getHand().get(new Random().nextInt(other.getHand().size()));
            other.getHand().remove(given);
            gameState.getHand().add(given);
        }
    }
}
