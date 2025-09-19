package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.Card.CardEffects.CompositeCardEffect;

public class MagicCard extends Card{


    public MagicCard(Long cardId, String cardName, CardType type, CompositeCardEffect effect) {
        super(cardId, cardName, type, effect);
    }

}
