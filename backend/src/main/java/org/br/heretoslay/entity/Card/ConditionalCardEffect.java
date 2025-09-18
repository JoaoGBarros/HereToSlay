package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.function.Predicate;

public class ConditionalCardEffect implements CardEffect {
    private final Predicate<GameState> condition;
    private final CardEffect effectIfTrue;
    private final CardEffect effectIfFalse;

    public ConditionalCardEffect(Predicate<GameState> condition, CardEffect effectIfTrue, CardEffect effectIfFalse) {
        this.condition = condition;
        this.effectIfTrue = effectIfTrue;
        this.effectIfFalse = effectIfFalse;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        if (condition.test(gameState)) {
            effectIfTrue.applyEffect(match, gameState);
        } else if (effectIfFalse != null) {
            effectIfFalse.applyEffect(match, gameState);
        }
    }
}