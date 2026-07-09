package org.br.heretoslay.entity.Card;

import java.util.List;
import java.util.Stack;
import java.util.function.Function;

public class CardDeck {

    // Assumption (exact base-game print counts weren't verified against a physical
    // deck): 2 copies of each Hero/Magic card and 3 of each Modifier, which gives a
    // deck size close to the base game's ~120-card draw pile.
    private static final int HERO_AND_MAGIC_COPIES = 2;
    private static final int MODIFIER_COPIES = 3;

    private static final List<Function<Long, HeroCard>> HEROES = List.of(
            CardFactory::badAxe, CardFactory::panChucks, CardFactory::dodgyDealer, CardFactory::nappingNibbles,
            CardFactory::peanut, CardFactory::holyCurselifter, CardFactory::seriousGrey, CardFactory::kitNapper,
            CardFactory::plunderingPuma, CardFactory::shurikitty, CardFactory::silentShadow, CardFactory::fluffy
    );

    private static final List<Function<Long, MagicCard>> MAGIC = List.of(
            CardFactory::forcefulWinds, CardFactory::windsOfChange
    );

    private static final List<Function<Long, ModifierCard>> MODIFIERS = List.of(
            ModifierFactory::plusOneMinusThree, ModifierFactory::plusTwoMinusTwo, ModifierFactory::plusThreeMinusOne,
            ModifierFactory::plusFour, ModifierFactory::minusFour
    );

    public static Stack<Card> createDeck() {
        Stack<Card> deck = new Stack<>();
        long nextId = 1;

        for (Function<Long, HeroCard> factory : HEROES) {
            for (int i = 0; i < HERO_AND_MAGIC_COPIES; i++) {
                deck.push(factory.apply(nextId++));
            }
        }

        for (Function<Long, MagicCard> factory : MAGIC) {
            for (int i = 0; i < HERO_AND_MAGIC_COPIES; i++) {
                deck.push(factory.apply(nextId++));
            }
        }

        for (Function<Long, ModifierCard> factory : MODIFIERS) {
            for (int i = 0; i < MODIFIER_COPIES; i++) {
                deck.push(factory.apply(nextId++));
            }
        }

        java.util.Collections.shuffle(deck);

        return deck;
    }
}
