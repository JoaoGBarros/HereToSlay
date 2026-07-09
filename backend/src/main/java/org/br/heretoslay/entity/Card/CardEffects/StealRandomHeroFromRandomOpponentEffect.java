package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.Card.CardType;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

/**
 * Steals one random Hero card from a random opponent who has at least one
 * (skips anyone protected). Used by Magic cards, which resolve instantly on
 * play with no target-selection round-trip - see Entangling Trap.
 */
public class StealRandomHeroFromRandomOpponentEffect implements CardEffect {

    @Override
    public void applyEffect(Match match, GameState gameState) {
        List<GameState> candidates = match.getPlayers().values().stream()
                .filter(gs -> gs != gameState)
                .filter(gs -> !gs.isHeroesProtectedFromSteal())
                .filter(gs -> gs.getParty().stream().anyMatch(c -> c.getType() == CardType.HERO))
                .collect(Collectors.toList());
        if (candidates.isEmpty()) return;

        GameState target = candidates.get(new Random().nextInt(candidates.size()));
        List<Card> heroes = target.getParty().stream().filter(c -> c.getType() == CardType.HERO).collect(Collectors.toList());
        Card stolen = heroes.get(new Random().nextInt(heroes.size()));
        target.getParty().remove(stolen);
        gameState.getParty().add(stolen);
    }
}
