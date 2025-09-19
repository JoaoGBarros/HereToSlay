package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.Card.CardEffects.CompositeCardEffect;

public class ChallengeCard extends Card{


    public ChallengeCard(Long cardId, String cardName, CardType type, CompositeCardEffect effect) {
        super(cardId, cardName, type, effect);
    }
}
