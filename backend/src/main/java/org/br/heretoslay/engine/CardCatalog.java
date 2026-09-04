package org.br.heretoslay.engine;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.List;

import static org.br.heretoslay.engine.GameCard.Kind.CHALLENGE;
import static org.br.heretoslay.engine.GameCard.Kind.HERO;
import static org.br.heretoslay.engine.GameCard.Kind.ITEM;
import static org.br.heretoslay.engine.GameCard.Kind.MAGIC;
import static org.br.heretoslay.engine.GameCard.Kind.MODIFIER;
import static org.br.heretoslay.engine.HeroClass.BARD;
import static org.br.heretoslay.engine.HeroClass.FIGHTER;
import static org.br.heretoslay.engine.HeroClass.GUARDIAN;
import static org.br.heretoslay.engine.HeroClass.RANGER;
import static org.br.heretoslay.engine.HeroClass.THIEF;
import static org.br.heretoslay.engine.HeroClass.WIZARD;

/**
 * The shared main deck. Heroes, Magic and Items are unique (one copy each);
 * Challenge and Modifier cards come in several copies.
 */
public final class CardCatalog {

    static final int CHALLENGE_COPIES = 14;
    static final int[][] MODIFIERS = {
            // {plus, minus, copies}; minus 0 means a single-value card
            {1, -3, 4}, {2, -2, 9}, {3, -1, 4}, {4, 0, 2}, {-4, 0, 2},
    };

    private CardCatalog() {}

    private static long nextId;

    public static Deque<GameCard> shuffledDeck() {
        nextId = 0;
        List<GameCard> cards = new ArrayList<>();
        cards.addAll(fighters());
        cards.addAll(bards());
        cards.addAll(guardians());
        cards.addAll(rangers());
        cards.addAll(thieves());
        cards.addAll(wizards());
        cards.addAll(magic());
        cards.addAll(items());
        for (int i = 0; i < CHALLENGE_COPIES; i++) cards.add(GameCard.challenge(++nextId));
        for (int[] m : MODIFIERS) {
            List<Integer> values = m[1] == 0 ? List.of(m[0]) : List.of(m[0], m[1]);
            String name = m[1] == 0 ? "Modifier " + (m[0] > 0 ? "+" : "") + m[0] : "Modifier +" + m[0] + "/" + m[1];
            for (int i = 0; i < m[2]; i++) cards.add(GameCard.modifier(++nextId, name, values));
        }
        Collections.shuffle(cards);
        return new ArrayDeque<>(cards);
    }

    private static GameCard hero(String name, HeroClass heroClass, int dice, Script script) {
        return GameCard.hero(++nextId, name, heroClass, dice, script);
    }

    private static List<GameCard> fighters() {
        return List.of(
                hero("Bad Axe", FIGHTER, 8, c -> List.of(c.destroy(1))),
                hero("Bear Claw", FIGHTER, 7, c -> List.of(
                        c.choosePlayer("target", p -> !p.getHand().isEmpty()),
                        c.pull(c.varOf("target"), 1, "pulled"),
                        c.when(() -> c.firstIs("pulled", HERO), c.pull(c.varOf("target"), 1, "pulled2")))),
                hero("Beary Wise", FIGHTER, 7, c -> List.of(
                        c.forEachOther(p -> true, pid -> List.of(
                                c.discard(() -> pid, 1, false, "lastDiscard"),
                                c.appendTo("pool", "lastDiscard"))),
                        c.takeOneFromDiscarded("pool"))),
                hero("Fury Knuckle", FIGHTER, 5, c -> List.of(
                        c.choosePlayer("target", p -> !p.getHand().isEmpty()),
                        c.pull(c.varOf("target"), 1, "pulled"),
                        c.when(() -> c.firstIs("pulled", CHALLENGE), c.pull(c.varOf("target"), 1, "pulled2")))),
                hero("Heavy Bear", FIGHTER, 5, c -> List.of(
                        c.choosePlayer("target", p -> true),
                        c.discard(c.varOf("target"), 2, false, "discarded"))),
                hero("Pan Chucks", FIGHTER, 8, c -> List.of(c.draw(2), c.mayRevealChallengeThenDestroy())),
                hero("Qi Bear", FIGHTER, 10, c -> List.of(
                        c.discard(c::owner, 3, true, "qiDiscarded"),
                        c.destroyPerDiscarded("qiDiscarded"))),
                hero("Tough Teddy", FIGHTER, 4, c -> List.of(
                        c.forEachOther(p -> p.classes().contains(FIGHTER),
                                pid -> List.of(c.discard(() -> pid, 1, false, "discarded")))))
        );
    }

    private static List<GameCard> bards() {
        return List.of(
                hero("Dodgy Dealer", BARD, 9, c -> List.of(c.choosePlayer("target", p -> true), c.tradeHands(c.varOf("target")))),
                hero("Fuzzy Cheeks", BARD, 8, c -> List.of(c.draw(1), c.playFromHand(HERO))),
                hero("Greedy Cheeks", BARD, 8, c -> List.of(
                        c.forEachOther(p -> !p.getHand().isEmpty(), pid -> List.of(c.giveToOwner(pid))))),
                hero("Lucky Bucky", BARD, 7, c -> List.of(
                        c.choosePlayer("target", p -> !p.getHand().isEmpty()),
                        c.pull(c.varOf("target"), 1, "pulled"),
                        c.mayPlayIf("pulled", HERO))),
                hero("Mellow Dee", BARD, 7, c -> List.of(c.draw(1), c.mayPlayIf("drawn", HERO))),
                hero("Napping Nibbles", BARD, 2, c -> List.of()),
                hero("Peanut", BARD, 7, c -> List.of(c.draw(2))),
                hero("Tipsy Tootie", BARD, 6, c -> List.of(
                        c.choosePlayer("target", p -> p.canHeroBeStolen() && !p.heroes().isEmpty()),
                        c.steal("target"),
                        c.moveSourceTo("target")))
        );
    }

    private static List<GameCard> guardians() {
        return List.of(
                hero("Calming Voice", GUARDIAN, 9, c -> List.of(c.protectFromSteal())),
                hero("Guiding Light", GUARDIAN, 7, c -> List.of(c.searchDiscard(HERO))),
                hero("Holy Curselifter", GUARDIAN, 5, c -> List.of(c.returnOneItem(true))),
                hero("Iron Resolve", GUARDIAN, 8, c -> List.of(c.unchallengeable())),
                hero("Mighty Blade", GUARDIAN, 8, c -> List.of(c.protectFromDestroy())),
                hero("Radiant Horn", GUARDIAN, 6, c -> List.of(c.searchDiscard(MODIFIER))),
                hero("Vibrant Glow", GUARDIAN, 9, c -> List.of(c.rollBonus(5))),
                hero("Wise Shield", GUARDIAN, 6, c -> List.of(c.rollBonus(3)))
        );
    }

    private static List<GameCard> rangers() {
        return List.of(
                hero("Bullseye", RANGER, 7, c -> List.of(c.keepOneFromTop(3))),
                hero("Hook", RANGER, 6, c -> List.of(c.playFromHand(ITEM), c.draw(1))),
                hero("Lookie Rookie", RANGER, 5, c -> List.of(c.searchDiscard(ITEM))),
                hero("Quick Draw", RANGER, 8, c -> List.of(c.draw(2), c.mayPlayIf("drawn", ITEM))),
                hero("Serious Grey", RANGER, 9, c -> List.of(c.destroy(1), c.draw(1))),
                hero("Sharp Fox", RANGER, 5, c -> List.of(c.choosePlayer("target", p -> true), c.lookAtHand(c.varOf("target")))),
                hero("Wildshot", RANGER, 8, c -> List.of(c.draw(3), c.discardOwn(1))),
                hero("Wily Red", RANGER, 10, c -> List.of(c.drawUntilHandSize(7)))
        );
    }

    private static List<GameCard> thieves() {
        return List.of(
                hero("Kit Napper", THIEF, 9, c -> List.of(c.steal(null))),
                hero("Meowzio", THIEF, 10, c -> List.of(
                        c.choosePlayer("target", p -> true),
                        c.steal("target"),
                        c.pull(c.varOf("target"), 1, "pulled"))),
                hero("Plundering Puma", THIEF, 6, c -> List.of(
                        c.choosePlayer("target", p -> !p.getHand().isEmpty()),
                        c.pull(c.varOf("target"), 2, "pulled"),
                        c.mayDraw(c.varOf("target")))),
                hero("Shurikitty", THIEF, 9, c -> List.of(c.destroy(1, true))),
                hero("Silent Shadow", THIEF, 8, c -> List.of(c.choosePlayer("target", p -> !p.getHand().isEmpty()), c.takeFromHand(c.varOf("target")))),
                hero("Slippery Paws", THIEF, 6, c -> List.of(
                        c.choosePlayer("target", p -> !p.getHand().isEmpty()),
                        c.pull(c.varOf("target"), 2, "pulled"),
                        c.discardFromPulled("pulled"))),
                hero("Sly Pickings", THIEF, 6, c -> List.of(
                        c.choosePlayer("target", p -> !p.getHand().isEmpty()),
                        c.pull(c.varOf("target"), 1, "pulled"),
                        c.mayPlayIf("pulled", ITEM))),
                hero("Smooth Mimimeow", THIEF, 7, c -> List.of(
                        c.forEachOther(p -> p.classes().contains(THIEF),
                                pid -> List.of(c.pull(() -> pid, 1, "pulled")))))
        );
    }

    private static List<GameCard> wizards() {
        return List.of(
                hero("Bun Bun", WIZARD, 5, c -> List.of(c.searchDiscard(MAGIC))),
                hero("Buttons", WIZARD, 6, c -> List.of(
                        c.choosePlayer("target", p -> !p.getHand().isEmpty()),
                        c.pull(c.varOf("target"), 1, "pulled"),
                        c.mayPlayIf("pulled", MAGIC))),
                hero("Fluffy", WIZARD, 10, c -> List.of(c.destroy(2))),
                hero("Hopper", WIZARD, 7, c -> List.of(c.choosePlayer("target", p -> !p.heroes().isEmpty()), c.sacrificeBy(c.varOf("target")))),
                hero("Snowball", WIZARD, 6, c -> List.of(
                        c.draw(1),
                        c.mayPlayIf("drawn", MAGIC),
                        c.when(() -> Boolean.TRUE.equals(c.flag("playedNow")), c.draw(1)))),
                hero("Spooky", WIZARD, 10, c -> List.of(
                        c.forEachOther(p -> !p.heroes().isEmpty(), pid -> List.of(c.sacrificeBy(() -> pid))))),
                hero("Whiskers", WIZARD, 11, c -> List.of(c.steal(null), c.destroy(1))),
                hero("Wiggles", WIZARD, 10, c -> List.of(c.steal(null), c.rollStolen()))
        );
    }

    private static List<GameCard> magic() {
        return List.of(
                GameCard.magic(++nextId, "Call to the Fallen", c -> List.of(c.searchDiscard(HERO))),
                GameCard.magic(++nextId, "Critical Boost", c -> List.of(c.draw(3), c.discardOwn(1))),
                GameCard.magic(++nextId, "Destructive Spell", c -> List.of(c.discardOwn(1), c.destroy(1))),
                GameCard.magic(++nextId, "Enchanted Spell", c -> List.of(c.rollBonus(2))),
                GameCard.magic(++nextId, "Entangling Trap", c -> List.of(c.discardOwn(2), c.steal(null))),
                GameCard.magic(++nextId, "Forced Exchange", c -> List.of(
                        c.choosePlayer("target", p -> p.canHeroBeStolen() && !p.heroes().isEmpty()),
                        c.steal("target"),
                        c.giveOwnHero("target"))),
                GameCard.magic(++nextId, "Forceful Winds", c -> List.of(c.returnAllItems())),
                GameCard.magic(++nextId, "Winds of Change", c -> List.of(c.returnOneItem(false), c.draw(1)))
        );
    }

    private static List<GameCard> items() {
        List<GameCard> items = new ArrayList<>();
        for (HeroClass cls : HeroClass.values()) {
            String name = cls.name().charAt(0) + cls.name().substring(1).toLowerCase() + " Mask";
            items.add(GameCard.item(++nextId, name, false, GameCard.ItemEffect.MASK, cls));
        }
        items.add(GameCard.item(++nextId, "Decoy Doll", false, GameCard.ItemEffect.DECOY_DOLL, null));
        items.add(GameCard.item(++nextId, "Particularly Rusty Coin", false, GameCard.ItemEffect.RUSTY_COIN, null));
        items.add(GameCard.item(++nextId, "Really Big Ring", false, GameCard.ItemEffect.BIG_RING, null));
        items.add(GameCard.item(++nextId, "Curse of the Snake's Eyes", true, GameCard.ItemEffect.SNAKE_EYES, null));
        items.add(GameCard.item(++nextId, "Sealing Key", true, GameCard.ItemEffect.SEALING_KEY, null));
        items.add(GameCard.item(++nextId, "Suspiciously Shiny Coin", true, GameCard.ItemEffect.SHINY_COIN, null));
        return items;
    }
}
