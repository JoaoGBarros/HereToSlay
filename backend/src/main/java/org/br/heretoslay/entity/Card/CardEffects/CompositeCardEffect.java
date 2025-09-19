package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.List;

public class CompositeCardEffect implements CardEffect {
    private final List<CardEffect> effects;

    public CompositeCardEffect(List<CardEffect> effects) {
        this.effects = effects;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        for (CardEffect effect : effects) {
            effect.applyEffect(match, gameState);
        }
    }

    public List<CardEffect> getEffects() {
        return effects;
    }
}
