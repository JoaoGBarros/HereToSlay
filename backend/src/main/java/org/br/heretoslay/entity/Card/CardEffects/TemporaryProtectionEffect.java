package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

public class TemporaryProtectionEffect implements CardEffect {

    public enum Kind { FROM_DESTROY, FROM_STEAL }
    public enum Duration { UNTIL_NEXT_TURN, PERMANENT }

    private final Kind kind;
    private final Duration duration;

    public TemporaryProtectionEffect(Kind kind, Duration duration) {
        this.kind = kind;
        this.duration = duration;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        if (kind == Kind.FROM_DESTROY) {
            if (duration == Duration.PERMANENT) {
                gameState.setHeroesPermanentlyProtectedFromDestroy(true);
            } else {
                gameState.setHeroesProtectedFromDestroy(true);
            }
        } else {
            gameState.setHeroesProtectedFromSteal(true);
        }
    }
}
