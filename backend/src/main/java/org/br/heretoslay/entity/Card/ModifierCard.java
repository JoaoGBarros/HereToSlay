package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.Card.CardEffects.CompositeCardEffect;

import java.util.List;

public class ModifierCard extends Card {

    private final List<Integer> possibleValues;

    public ModifierCard(Long cardId, String cardName, List<Integer> possibleValues) {
        super(cardId, cardName, CardType.MODIFIER, new CompositeCardEffect(List.of()));
        this.possibleValues = possibleValues;
    }

    public List<Integer> getPossibleValues() {
        return possibleValues;
    }
}
