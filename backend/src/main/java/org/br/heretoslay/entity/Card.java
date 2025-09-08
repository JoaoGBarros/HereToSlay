package org.br.heretoslay.entity;

public class Card {

    private Long cardId;
    private String cardName;


    public Card(Long cardId, String cardName) {
        this.cardId = cardId;
        this.cardName = cardName;
    }

    public Long getCardId() {
        return cardId;
    }

    public String getCardName() {
        return cardName;
    }
}
