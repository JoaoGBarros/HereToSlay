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
 * Destroys one random Hero card from a random opponent who has at least one
 * (skips anyone protected). Used for a second, non-selectable destroy target
 * alongside a UI-selected steal - e.g. Whiskers ("STEAL a Hero and DESTROY a
 * Hero"), where letting the player pick two independent targets in one pass
 * isn't supported by the current single-selection-phase flow.
 */
public class DestroyRandomHeroFromRandomOpponentEffect implements CardEffect {

    @Override
    public void applyEffect(Match match, GameState gameState) {
        List<GameState> candidates = match.getPlayers().values().stream()
                .filter(gs -> gs != gameState)
                .filter(gs -> !gs.isHeroesProtectedFromDestroy())
                .filter(gs -> gs.getParty().stream().anyMatch(c -> c.getType() == CardType.HERO))
                .collect(Collectors.toList());
        if (candidates.isEmpty()) return;

        GameState target = candidates.get(new Random().nextInt(candidates.size()));
        List<Card> heroes = target.getParty().stream().filter(c -> c.getType() == CardType.HERO).collect(Collectors.toList());
        Card toDestroy = heroes.get(new Random().nextInt(heroes.size()));
        target.getParty().remove(toDestroy);
        match.getDiscardPile().add(toDestroy);
    }
}
