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

    public static HeroCard bearClaw(Long id) {
        StealHandEffect steal = new StealHandEffect(1, emptyTargetMap());
        return new HeroCard(id, "Bear Claw", CardType.HERO, HeroClass.FIGHTER, 7,
                fx(new StealHandWithBonusIfTypeEffect(steal, CardType.HERO)));
    }

    public static HeroCard bearyWise(Long id) {
        return new HeroCard(id, "Beary Wise", CardType.HERO, HeroClass.FIGHTER, 7,
                fx(new ForEachOtherPlayerEffect(new DiscardEffect(1)), new TakeFromDiscardEffect(1)));
    }

    public static HeroCard furyKnuckle(Long id) {
        StealHandEffect steal = new StealHandEffect(1, emptyTargetMap());
        return new HeroCard(id, "Fury Knuckle", CardType.HERO, HeroClass.FIGHTER, 5,
                fx(new StealHandWithBonusIfTypeEffect(steal, CardType.CHALLENGE)));
    }

    public static HeroCard heavyBear(Long id) {
        return new HeroCard(id, "Heavy Bear", CardType.HERO, HeroClass.FIGHTER, 5,
                fx(new ChosenPlayerEffect(new DiscardEffect(2))));
    }

    public static HeroCard panChucks(Long id) {
        Predicate<GameState> drewAChallengeCard = gs ->
                gs.getLastDrawnCards().stream().anyMatch(c -> c.getType() == CardType.CHALLENGE);
        return new HeroCard(id, "Pan Chucks", CardType.HERO, HeroClass.FIGHTER, 8,
                fx(new DrawEffect(2), new ConditionalCardEffect(drewAChallengeCard,
                        new DestroyCardEffect(1, emptyTargetMap()), null)));
    }

    public static HeroCard qiBear(Long id) {
        DestroyCardEffect destroy = new DestroyCardEffect(0, emptyTargetMap());
        return new HeroCard(id, "Qi Bear", CardType.HERO, HeroClass.FIGHTER, 10,
                fx(new DiscardForEffect(3, destroy), destroy));
    }

    public static HeroCard toughTeddy(Long id) {
        return new HeroCard(id, "Tough Teddy", CardType.HERO, HeroClass.FIGHTER, 4,
                fx(new ForEachOtherPlayerEffect(new ConditionalCardEffect(hasHeroClass(HeroClass.FIGHTER), new DiscardEffect(1), null))));
    }

    // ------------------------------------------------------------------ Bard

    public static HeroCard dodgyDealer(Long id) {
        return new HeroCard(id, "Dodgy Dealer", CardType.HERO, HeroClass.BARD, 9, fx(new TradeHandEffect()));
    }

    public static HeroCard fuzzyCheeks(Long id) {
        return new HeroCard(id, "Fuzzy Cheeks", CardType.HERO, HeroClass.BARD, 8,
                fx(new DrawEffect(1), new AutoPlayFromHandEffect(CardType.HERO)));
    }

    public static HeroCard greedyCheeks(Long id) {
        return new HeroCard(id, "Greedy Cheeks", CardType.HERO, HeroClass.BARD, 8,
                fx(new ForEachOtherPlayerGiveToCasterEffect(gs -> true)));
    }

    public static HeroCard luckyBucky(Long id) {
        StealHandEffect steal = new StealHandEffect(1, emptyTargetMap());
        return new HeroCard(id, "Lucky Bucky", CardType.HERO, HeroClass.BARD, 7,
                fx(steal, new PlayLastHandCardIfTypeEffect(CardType.HERO)));
    }

    public static HeroCard mellowDee(Long id) {
        return new HeroCard(id, "Mellow Dee", CardType.HERO, HeroClass.BARD, 7,
                fx(new DrawEffect(1), new PlayIfDrawnTypeEffect(CardType.HERO)));
    }

    public static HeroCard nappingNibbles(Long id) {
        return new HeroCard(id, "Napping Nibbles", CardType.HERO, HeroClass.BARD, 2, fx());
    }

    public static HeroCard peanut(Long id) {
        return new HeroCard(id, "Peanut", CardType.HERO, HeroClass.BARD, 7, fx(new DrawEffect(2)));
    }

    public static HeroCard tipsyTootie(Long id) {
        StealCardEffect steal = new StealCardEffect(1, emptyTargetMap());
        return new HeroCard(id, "Tipsy Tootie", CardType.HERO, HeroClass.BARD, 6,
                fx(new SwapSelfForStolenHeroEffect(steal)));
    }

    // -------------------------------------------------------------- Guardian

    public static HeroCard calmingVoice(Long id) {
        return new HeroCard(id, "Calming Voice", CardType.HERO, HeroClass.GUARDIAN, 9,
                fx(new TemporaryProtectionEffect(TemporaryProtectionEffect.Kind.FROM_STEAL, TemporaryProtectionEffect.Duration.UNTIL_NEXT_TURN)));
    }

    public static HeroCard guidingLight(Long id) {
        return new HeroCard(id, "Guiding Light", CardType.HERO, HeroClass.GUARDIAN, 7,
                fx(new SearchDiscardEffect(CardType.HERO)));
    }

    public static HeroCard holyCurselifter(Long id) {
        // Cursed/equipped items aren't modeled anywhere in the engine yet (ItemCard has
        // no equip relation) - kept as a no-op until that system exists.
        return new HeroCard(id, "Holy Curselifter", CardType.HERO, HeroClass.GUARDIAN, 5, fx());
    }

    public static HeroCard ironResolve(Long id) {
        return new HeroCard(id, "Iron Resolve", CardType.HERO, HeroClass.GUARDIAN, 8,
                fx(new UnchallengeableStatusEffect(UnchallengeableStatusEffect.Scope.ALL_CARDS_REST_OF_TURN)));
    }

    public static HeroCard mightyBlade(Long id) {
        return new HeroCard(id, "Mighty Blade", CardType.HERO, HeroClass.GUARDIAN, 8,
                fx(new TemporaryProtectionEffect(TemporaryProtectionEffect.Kind.FROM_DESTROY, TemporaryProtectionEffect.Duration.UNTIL_NEXT_TURN)));
    }

    public static HeroCard radiantHorn(Long id) {
        return new HeroCard(id, "Radiant Horn", CardType.HERO, HeroClass.GUARDIAN, 6,
                fx(new SearchDiscardEffect(CardType.MODIFIER)));
    }

    public static HeroCard vibrantGlow(Long id) {
        return new HeroCard(id, "Vibrant Glow", CardType.HERO, HeroClass.GUARDIAN, 9,
                fx(new RollModifierStatusEffect(5, RollModifierStatusEffect.Duration.UNTIL_END_OF_TURN, "Vibrant Glow")));
    }

    public static HeroCard wiseShield(Long id) {
        return new HeroCard(id, "Wise Shield", CardType.HERO, HeroClass.GUARDIAN, 6,
                fx(new RollModifierStatusEffect(3, RollModifierStatusEffect.Duration.UNTIL_END_OF_TURN, "Wise Shield")));
    }

    // ---------------------------------------------------------------- Ranger

    public static HeroCard bullseye(Long id) {
        return new HeroCard(id, "Bullseye", CardType.HERO, HeroClass.RANGER, 7, fx(new ScryEffect(3, 1)));
    }

    public static HeroCard hook(Long id) {
        return new HeroCard(id, "Hook", CardType.HERO, HeroClass.RANGER, 6,
                fx(new AutoPlayFromHandEffect(CardType.ITEM), new DrawEffect(1)));
    }

    public static HeroCard lookieRookie(Long id) {
        return new HeroCard(id, "Lookie Rookie", CardType.HERO, HeroClass.RANGER, 5,
                fx(new SearchDiscardEffect(CardType.ITEM)));
    }

    public static HeroCard quickDraw(Long id) {
        return new HeroCard(id, "Quick Draw", CardType.HERO, HeroClass.RANGER, 8,
                fx(new DrawEffect(2), new PlayIfDrawnTypeEffect(CardType.ITEM)));
    }

    public static HeroCard seriousGrey(Long id) {
        return new HeroCard(id, "Serious Grey", CardType.HERO, HeroClass.RANGER, 9,
                fx(new DestroyCardEffect(1, emptyTargetMap()), new DrawEffect(1)));
    }

    public static HeroCard sharpFox(Long id) {
        return new HeroCard(id, "Sharp Fox", CardType.HERO, HeroClass.RANGER, 5, fx(new LookAtHandEffect()));
    }

    public static HeroCard wildshot(Long id) {
        return new HeroCard(id, "Wildshot", CardType.HERO, HeroClass.RANGER, 8,
                fx(new DrawEffect(3), new DiscardEffect(1)));
    }

    public static HeroCard wilyRed(Long id) {
        return new HeroCard(id, "Wily Red", CardType.HERO, HeroClass.RANGER, 10, fx(new DrawUpToEffect(7)));
    }

    // ----------------------------------------------------------------- Thief

    public static HeroCard kitNapper(Long id) {
        return new HeroCard(id, "Kit Napper", CardType.HERO, HeroClass.THIEF, 9,
                fx(new StealCardEffect(1, emptyTargetMap())));
    }

    public static HeroCard meowzio(Long id) {
        StealCardEffect steal = new StealCardEffect(1, emptyTargetMap());
        return new HeroCard(id, "Meowzio", CardType.HERO, HeroClass.THIEF, 10,
                fx(new PullRandomHandCardFromTargetsEffect(steal), steal));
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

    public static HeroCard slipperyPaws(Long id) {
        return new HeroCard(id, "Slippery Paws", CardType.HERO, HeroClass.THIEF, 6,
                fx(new StealHandEffect(2, emptyTargetMap()), new DiscardLastAddedFromHandEffect(1)));
    }

    public static HeroCard slyPickings(Long id) {
        return new HeroCard(id, "Sly Pickings", CardType.HERO, HeroClass.THIEF, 6,
                fx(new StealHandEffect(1, emptyTargetMap()), new PlayLastHandCardIfTypeEffect(CardType.ITEM)));
    }

    public static HeroCard smoothMimimeow(Long id) {
        return new HeroCard(id, "Smooth Mimimeow", CardType.HERO, HeroClass.THIEF, 7,
                fx(new ForEachOtherPlayerGiveToCasterEffect(hasHeroClass(HeroClass.THIEF))));
    }

    // ---------------------------------------------------------------- Wizard

    public static HeroCard bunBun(Long id) {
        return new HeroCard(id, "Bun Bun", CardType.HERO, HeroClass.WIZARD, 5,
                fx(new SearchDiscardEffect(CardType.MAGIC)));
    }

    public static HeroCard buttons(Long id) {
        return new HeroCard(id, "Buttons", CardType.HERO, HeroClass.WIZARD, 6,
                fx(new StealHandEffect(1, emptyTargetMap()), new PlayLastHandCardIfTypeEffect(CardType.MAGIC)));
    }

    public static HeroCard fluffy(Long id) {
        return new HeroCard(id, "Fluffy", CardType.HERO, HeroClass.WIZARD, 10,
                fx(new DestroyCardEffect(2, emptyTargetMap())));
    }

    public static HeroCard hopper(Long id) {
        return new HeroCard(id, "Hopper", CardType.HERO, HeroClass.WIZARD, 7,
                fx(new ChosenPlayerEffect(new SacrificeEffect())));
    }

    public static HeroCard snowball(Long id) {
        Predicate<GameState> lastDrawnIsMagic = gs -> {
            List<Card> drawn = gs.getLastDrawnCards();
            return !drawn.isEmpty() && drawn.get(drawn.size() - 1).getType() == CardType.MAGIC;
        };
        return new HeroCard(id, "Snowball", CardType.HERO, HeroClass.WIZARD, 6,
                fx(new DrawEffect(1), new PlayIfDrawnTypeEffect(CardType.MAGIC),
                        new ConditionalCardEffect(lastDrawnIsMagic, new DrawEffect(1), null)));
    }

    public static HeroCard spooky(Long id) {
        return new HeroCard(id, "Spooky", CardType.HERO, HeroClass.WIZARD, 10,
                fx(new ForEachOtherPlayerEffect(new SacrificeEffect())));
    }

    public static HeroCard whiskers(Long id) {
        return new HeroCard(id, "Whiskers", CardType.HERO, HeroClass.WIZARD, 11,
                fx(new StealCardEffect(1, emptyTargetMap()), new DestroyRandomHeroFromRandomOpponentEffect()));
    }

    public static HeroCard wiggles(Long id) {
        StealCardEffect steal = new StealCardEffect(1, emptyTargetMap());
        return new HeroCard(id, "Wiggles", CardType.HERO, HeroClass.WIZARD, 10,
                fx(new StealAndUseEffectImmediatelyEffect(steal)));
    }

    // ----------------------------------------------------------------- Magic

    public static MagicCard callToTheFallen(Long id) {
        return new MagicCard(id, "Call to the Fallen", CardType.MAGIC, fx(new SearchDiscardEffect(CardType.HERO)));
    }

    public static MagicCard criticalBoost(Long id) {
        return new MagicCard(id, "Critical Boost", CardType.MAGIC, fx(new DrawEffect(3), new DiscardEffect(1)));
    }

    public static MagicCard destructiveSpell(Long id) {
        return new MagicCard(id, "Destructive Spell", CardType.MAGIC,
                fx(new DiscardEffect(1), new DestroyRandomHeroFromRandomOpponentEffect()));
    }

    public static MagicCard enchantedSpell(Long id) {
        return new MagicCard(id, "Enchanted Spell", CardType.MAGIC,
                fx(new RollModifierStatusEffect(2, RollModifierStatusEffect.Duration.UNTIL_END_OF_TURN, "Enchanted Spell")));
    }

    public static MagicCard entanglingTrap(Long id) {
        return new MagicCard(id, "Entangling Trap", CardType.MAGIC,
                fx(new DiscardEffect(2), new StealRandomHeroFromRandomOpponentEffect()));
    }

    public static MagicCard forcedExchange(Long id) {
        return new MagicCard(id, "Forced Exchange", CardType.MAGIC, fx(new ForcedExchangeEffect()));
    }

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
