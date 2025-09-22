package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.Card.CardEffects.CompositeCardEffect;
import org.br.heretoslay.entity.Card.CardEffects.DrawEffect;
import org.br.heretoslay.entity.Card.CardEffects.StealCardEffect;
import org.br.heretoslay.entity.Card.CardEffects.StealHandEffect;

import java.util.HashMap;
import java.util.List;
import java.util.Stack;

public class CardDeck {

    public static Stack<Card> createDeck() {
        Stack<Card> deck = new Stack<>();

        for(int i = 1; i <= 120; i++){
            deck.push(new HeroCard((long) i, "bard " + i, CardType.HERO, new CompositeCardEffect(
                    List.of(
                            new StealHandEffect(
                                    2, new HashMap<>()
                            )
                    )
            ))
            );
        }

        java.util.Collections.shuffle(deck);

        return deck;
    }
}
