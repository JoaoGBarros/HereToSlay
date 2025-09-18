package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.java_websocket.WebSocket;

public class ChallengeCard extends Card{


    public ChallengeCard(Long cardId, String cardName, CardType type, CompositeCardEffect effect) {
        super(cardId, cardName, type, effect);
    }
}
