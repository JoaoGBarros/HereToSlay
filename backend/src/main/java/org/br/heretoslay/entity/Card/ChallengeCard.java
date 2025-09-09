package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.java_websocket.WebSocket;

public class ChallengeCard extends Card{

    public ChallengeCard(Long cardId, String name) {
        super(cardId,name, CardType.CHALLENGE);
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        gameState.setUsername("CHALLENGE CARD PLAYED");
    }

}
