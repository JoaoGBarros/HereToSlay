package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

public class RollModifierStatusEffect implements CardEffect {

    public enum Duration { UNTIL_END_OF_TURN, PERMANENT }

    private final int amount;
    private final Duration duration;
    private final String source;

    public RollModifierStatusEffect(int amount, Duration duration) {
        this(amount, duration, "Card effect");
    }

    public RollModifierStatusEffect(int amount, Duration duration, String source) {
        this.amount = amount;
        this.duration = duration;
        this.source = source;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        if (duration == Duration.PERMANENT) {
            gameState.addPermanentRollBonus(amount, source);
        } else {
            gameState.addRollBonusUntilEndOfTurn(amount, source);
        }
    }
}
