package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.java_websocket.WebSocket;

public class ItemCard extends Card {

    public ItemCard(Long cardId, String name) {
        super(cardId,name, CardType.ITEM);
    }


    @Override
    public void applyEffect(Match match, GameState gameState) {
        gameState.setUsername("ITEM CARD PLAYED");
    }
}
