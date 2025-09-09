package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.java_websocket.WebSocket;

public abstract class Card {

    private Long cardId;
    private String cardName;
    private CardType type;

    public Card(Long cardId, String cardName, CardType type) {
        this.cardId = cardId;
        this.cardName = cardName;
        this.type = type;
    }

    public Long getCardId() { return cardId; }
    public String getCardName() { return cardName; }
    public CardType getType() { return type; }

    public abstract void applyEffect(Match match, GameState gameState);
}
