package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

public class DrawUpToEffect implements CardEffect {

    private final int targetHandSize;

    public DrawUpToEffect(int targetHandSize) {
        this.targetHandSize = targetHandSize;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        int safetyLimit = targetHandSize + 20;
        int draws = 0;
        while (gameState.getHand().size() < targetHandSize && draws < safetyLimit) {
            int before = gameState.getHand().size();
            match.drawCard(gameState);
            if (gameState.getHand().size() == before) break;
            draws++;
        }
    }
}
