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
 * Steals a random Hero from a random opponent and gives them a random Hero
 * of the caster's own in return. Resolves instantly - see Forced Exchange.
 */
public class ForcedExchangeEffect implements CardEffect {

    @Override
    public void applyEffect(Match match, GameState gameState) {
        List<Card> ownHeroes = gameState.getParty().stream().filter(c -> c.getType() == CardType.HERO).collect(Collectors.toList());
        if (ownHeroes.isEmpty()) return;

        List<GameState> candidates = match.getPlayers().values().stream()
                .filter(gs -> gs != gameState)
                .filter(gs -> !gs.isHeroesProtectedFromSteal())
                .filter(gs -> gs.getParty().stream().anyMatch(c -> c.getType() == CardType.HERO))
                .collect(Collectors.toList());
        if (candidates.isEmpty()) return;

        GameState target = candidates.get(new Random().nextInt(candidates.size()));
        List<Card> targetHeroes = target.getParty().stream().filter(c -> c.getType() == CardType.HERO).collect(Collectors.toList());

        Card taken = targetHeroes.get(new Random().nextInt(targetHeroes.size()));
        Card given = ownHeroes.get(new Random().nextInt(ownHeroes.size()));

        target.getParty().remove(taken);
        gameState.getParty().add(taken);

        gameState.getParty().remove(given);
        target.getParty().add(given);
    }
}
