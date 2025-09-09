package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.java_websocket.WebSocket;

public class MagicCard extends Card{

    public MagicCard(Long cardId, String name) {
        super(cardId,name, CardType.MAGIC);
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        gameState.setUsername("MAGIC CARD PLAYED");
    }
}
