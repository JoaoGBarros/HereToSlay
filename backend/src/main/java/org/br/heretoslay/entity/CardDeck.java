package org.br.heretoslay.entity;

import java.util.Stack;

public class CardDeck {

    public static Stack<Card> createDeck() {
        Stack<Card> deck = new Stack<>();

        for(int i = 1; i <= 120; i++){
            deck.push(new Card((long) i, "bard " + i));
        }

        java.util.Collections.shuffle(deck);

        return deck;
    }
}
