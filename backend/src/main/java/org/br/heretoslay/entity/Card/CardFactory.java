package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.Card.CardEffects.*;
import org.br.heretoslay.entity.GameState;

import java.util.HashMap;
import java.util.List;
import java.util.function.Predicate;

/**
 * Builds fresh instances of every base-game Hero and Magic card, each call
 * producing its own CardEffect instances (target-selection state on effects
 * like DestroyCardEffect must never be shared between two copies of a card).
 * Card texts verified against unstablegameswiki.com - see plans/here-to-slay-etapa2.
 * Several cards use a documented MVP simplification where the physical game
 * would need a second selection round-trip or player choice not yet
 * supported by the target-selection state machine (search inline comments
 * for "simplificado"/"simplification").
 */
public class CardFactory {

    private static CompositeCardEffect fx(CardEffect... effects) {
        return new CompositeCardEffect(List.of(effects));
    }

    private static Predicate<GameState> hasHeroClass(HeroClass heroClass) {
        return gs -> gs.getParty().stream()
                .filter(c -> c.getType() == CardType.HERO)
                .anyMatch(c -> ((HeroCard) c).getHeroClass() == heroClass);
    }

    private static HashMap<String, List<Long>> emptyTargetMap() {
        return new HashMap<>();
    }

    // ---------------------------------------------------------------- Fighter

    public static HeroCard badAxe(Long id) {
        return new HeroCard(id, "Bad Axe", CardType.HERO, HeroClass.FIGHTER, 8,
                fx(new DestroyCardEffect(1, emptyTargetMap())));
    }

    public static HeroCard panChucks(Long id) {
        Predicate<GameState> drewAChallengeCard = gs ->
                gs.getLastDrawnCards().stream().anyMatch(c -> c.getType() == CardType.CHALLENGE);
        return new HeroCard(id, "Pan Chucks", CardType.HERO, HeroClass.FIGHTER, 8,
                fx(new DrawEffect(2), new ConditionalCardEffect(drewAChallengeCard,
                        new DestroyCardEffect(1, emptyTargetMap()), null)));
    }

    // ------------------------------------------------------------------ Bard

    public static HeroCard dodgyDealer(Long id) {
        return new HeroCard(id, "Dodgy Dealer", CardType.HERO, HeroClass.BARD, 9, fx(new TradeHandEffect()));
    }

    public static HeroCard nappingNibbles(Long id) {
        return new HeroCard(id, "Napping Nibbles", CardType.HERO, HeroClass.BARD, 2, fx());
    }

    public static HeroCard peanut(Long id) {
        return new HeroCard(id, "Peanut", CardType.HERO, HeroClass.BARD, 7, fx(new DrawEffect(2)));
    }

    // -------------------------------------------------------------- Guardian

    public static HeroCard holyCurselifter(Long id) {
        // Cursed/equipped items aren't modeled anywhere in the engine yet (ItemCard has
        // no equip relation) - kept as a no-op until that system exists.
        return new HeroCard(id, "Holy Curselifter", CardType.HERO, HeroClass.GUARDIAN, 5, fx());
    }

    // ---------------------------------------------------------------- Ranger

    public static HeroCard seriousGrey(Long id) {
        return new HeroCard(id, "Serious Grey", CardType.HERO, HeroClass.RANGER, 9,
                fx(new DestroyCardEffect(1, emptyTargetMap()), new DrawEffect(1)));
    }

    // ----------------------------------------------------------------- Thief

    public static HeroCard kitNapper(Long id) {
        return new HeroCard(id, "Kit Napper", CardType.HERO, HeroClass.THIEF, 9,
                fx(new StealCardEffect(1, emptyTargetMap())));
    }

    public static HeroCard plunderingPuma(Long id) {
        // "That player may DRAW a card" (compensation for the victim) is omitted -
        // simplificado: doesn't change the caster's outcome, only softens the victim's loss.
        return new HeroCard(id, "Plundering Puma", CardType.HERO, HeroClass.THIEF, 6,
                fx(new StealHandEffect(2, emptyTargetMap())));
    }

    public static HeroCard shurikitty(Long id) {
        // Equipped-item bonus is unreachable until items/equip are modeled.
        return new HeroCard(id, "Shurikitty", CardType.HERO, HeroClass.THIEF, 9,
                fx(new DestroyCardEffect(1, emptyTargetMap())));
    }

    public static HeroCard silentShadow(Long id) {
        return new HeroCard(id, "Silent Shadow", CardType.HERO, HeroClass.THIEF, 8,
                fx(new StealHandEffect(1, emptyTargetMap())));
    }

    // ---------------------------------------------------------------- Wizard

    public static HeroCard fluffy(Long id) {
        return new HeroCard(id, "Fluffy", CardType.HERO, HeroClass.WIZARD, 10,
                fx(new DestroyCardEffect(2, emptyTargetMap())));
    }

    // ----------------------------------------------------------------- Magic

    public static MagicCard forcefulWinds(Long id) {
        // Returning every equipped item to its owner needs the (not yet modeled)
        // item-equip system; kept as a no-op until that exists.
        return new MagicCard(id, "Forceful Winds", CardType.MAGIC, fx());
    }

    public static MagicCard windsOfChange(Long id) {
        // Same as above, plus a draw - the draw still applies on its own.
        return new MagicCard(id, "Winds of Change", CardType.MAGIC, fx(new DrawEffect(1)));
    }
}
