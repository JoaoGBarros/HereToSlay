package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.java_websocket.WebSocket;

public abstract class Card {

    private Long cardId;
    private String cardName;
    private CardType type;
    private CompositeCardEffect effect;

    public Card(Long cardId, String cardName, CardType type, CompositeCardEffect effect) {
        this.cardId = cardId;
        this.cardName = cardName;
        this.type = type;
        this.effect = effect;
    }

    public Long getCardId() { return cardId; }
    public String getCardName() { return cardName; }
    public CardType getType() { return type; }
    public CompositeCardEffect getEffect() { return effect; }
}
