package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.java_websocket.WebSocket;

public class ModifierCard extends Card {

    private int modifierValue;

    public ModifierCard(Long cardId, String cardName, int modifierValue) {
        super(cardId, cardName, CardType.MODIFIER);
        this.modifierValue = modifierValue;
    }

    public int getModifierValue() {
        return modifierValue;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        gameState.setUsername("MODIFIER CARD PLAYED");
    }
}
