package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

public class DrawEffect implements CardEffect {

    private final int numberOfCards;

    public DrawEffect(int numberOfCards) {
        this.numberOfCards = numberOfCards;
    }


    @Override
    public void applyEffect(Match match, GameState gameState) {
        for(int i = 0; i < numberOfCards; i++) {
            match.drawCard(gameState);
        }
    }
}
