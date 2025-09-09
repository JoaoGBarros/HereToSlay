package org.br.heretoslay.entity.Card;

import java.util.Stack;

public class CardDeck {

    public static Stack<Card> createDeck() {
        Stack<Card> deck = new Stack<>();

        for(int i = 1; i <= 120; i++){
            deck.push(new HeroCard((long) i, "bard " + i, 4));
        }

        java.util.Collections.shuffle(deck);

        return deck;
    }
}
