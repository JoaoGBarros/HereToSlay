package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.Card.CardEffects.DiscardEffect;
import org.br.heretoslay.entity.Card.CardEffects.SacrificeEffect;
import org.br.heretoslay.entity.GameEventBus;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.function.Predicate;

/**
 * Builds the 15 base-game Monster cards. Party requirements, fight-back
 * rolls and slay rolls are verified against unstablegameswiki.com (see
 * plans/here-to-slay-etapa2). 6 rewards are static (permanent buff/status,
 * applied once here); 9 are reactive and subscribe a listener on
 * match.getEventBus() scoped to the slayer's real player id.
 *
 * Corrupted Sabretooth's reward ("may substitute Destroy with Steal") is a
 * documented gap: GameEventBus only notifies AFTER an effect resolves, so it
 * cannot intercept/replace a DestroyCardEffect in flight. Left as a no-op
 * until a "before-effect" hook exists.
 */
public class MonsterFactory {

    private static Predicate<GameState> anyHeroes(int count) {
        return gs -> gs.getParty().stream().filter(c -> c.getType() == CardType.HERO).count() >= count;
    }

    private static Predicate<GameState> classPlusAny(HeroClass heroClass) {
        return gs -> gs.getParty().stream().filter(c -> c.getType() == CardType.HERO)
                .anyMatch(c -> ((HeroCard) c).getHeroClass() == heroClass)
                && gs.getParty().stream().filter(c -> c.getType() == CardType.HERO).count() >= 2;
    }

    public static MonsterCard abyssQueen(Long id) {
        MonsterReward reward = (match, slayer) -> {
            String slayerId = match.getPlayerId(slayer);
            match.getEventBus().subscribe(GameEventBus.EventType.MODIFIER_PLAYED, event -> {
                if (!slayerId.equals(event.playerId()) && slayerId.equals(event.payload())) {
                    slayer.addRollBonusUntilEndOfTurn(1, "Abyss Queen (ally played a Modifier)");
                }
            });
        };
        return new MonsterCard(id, "Abyss Queen", anyHeroes(2), "Any 2 heroes", 5, new SacrificeEffect(), 8, reward);
    }

    public static MonsterCard anuranCauldron(Long id) {
        return new MonsterCard(id, "Anuran Cauldron", anyHeroes(3), "Any 3 heroes", 6, new SacrificeEffect(), 7,
                (match, slayer) -> slayer.addPermanentRollBonus(1, "Anuran Cauldron (Slain)"));
    }

    public static MonsterCard articAries(Long id) {
        MonsterReward reward = (match, slayer) -> {
            String slayerId = match.getPlayerId(slayer);
            match.getEventBus().subscribe(GameEventBus.EventType.HERO_EFFECT_SUCCEEDED, event -> {
                if (slayerId.equals(event.playerId())) {
                    match.drawCard(slayer);
                }
            });
        };
        return new MonsterCard(id, "Artic Aries", anyHeroes(1), "Any 1 hero", 6, new SacrificeEffect(), 10, reward);
    }

    public static MonsterCard bloodwing(Long id) {
        MonsterReward reward = (match, slayer) -> {
            String slayerId = match.getPlayerId(slayer);
            match.getEventBus().subscribe(GameEventBus.EventType.PLAYER_CHALLENGED, event -> {
                if (slayerId.equals(event.playerId())) {
                    GameState challenger = match.getPlayers().get((String) event.payload());
                    if (challenger != null) {
                        new DiscardEffect(1).applyEffect(match, challenger);
                    }
                }
            });
        };
        return new MonsterCard(id, "Bloodwing", anyHeroes(2), "Any 2 heroes", 6, new SacrificeEffect(), 9, reward);
    }

    public static MonsterCard corruptedSabretooth(Long id) {
        MonsterReward reward = (match, slayer) -> {
            // See class-level note: destroy->steal substitution needs a before-effect hook that doesn't exist yet.
        };
        return new MonsterCard(id, "Corrupted Sabretooth", anyHeroes(3), "Any 3 heroes", 6, new SacrificeEffect(), 9, reward);
    }

    public static MonsterCard crownedSerpent(Long id) {
        MonsterReward reward = (match, slayer) -> {
            String slayerId = match.getPlayerId(slayer);
            match.getEventBus().subscribe(GameEventBus.EventType.MODIFIER_PLAYED, event -> match.drawCard(slayer));
        };
        return new MonsterCard(id, "Crowned Serpent", anyHeroes(2), "Any 2 heroes", 7, new SacrificeEffect(), 10, reward);
    }

    public static MonsterCard darkDragonKing(Long id) {
        return new MonsterCard(id, "Dark Dragon King", classPlusAny(HeroClass.BARD), "Bard + 1 any", 4, new DiscardEffect(2), 8,
                (match, slayer) -> slayer.addPermanentRollBonus(1, "Dark Dragon King (Slain)"));
    }

    public static MonsterCard dracos(Long id) {
        // Wiki flags Dracos' thresholds as intentionally inverted vs the other monsters
        // (low roll slays, high roll triggers the penalty) - kept as documented in the plan.
        MonsterReward reward = (match, slayer) -> {
            String slayerId = match.getPlayerId(slayer);
            match.getEventBus().subscribe(GameEventBus.EventType.HERO_DESTROYED, event -> {
                if (slayerId.equals(event.playerId())) {
                    match.drawCard(slayer);
                }
            });
        };
        return new MonsterCard(id, "Dracos", anyHeroes(1), "Any 1 hero", 8, new SacrificeEffect(), 5, reward);
    }

    public static MonsterCard malamammoth(Long id) {
        MonsterReward reward = (match, slayer) -> {
            String slayerId = match.getPlayerId(slayer);
            match.getEventBus().subscribe(GameEventBus.EventType.CARD_DRAWN, event -> {
                Card drawn = (Card) event.payload();
                if (slayerId.equals(event.playerId()) && drawn.getType() == CardType.ITEM) {
                    match.playCardImmediately(slayer, drawn);
                }
            });
        };
        return new MonsterCard(id, "Malamammoth", classPlusAny(HeroClass.RANGER), "Ranger + 1 any", 4, new DiscardEffect(2), 8, reward);
    }

    public static MonsterCard megaSlime(Long id) {
        return new MonsterCard(id, "Mega Slime", anyHeroes(4), "Any 4 heroes", 7, new SacrificeEffect(), 8,
                (match, slayer) -> slayer.addPermanentExtraActionPoints(1));
    }

    public static MonsterCard orthus(Long id) {
        MonsterReward reward = (match, slayer) -> {
            String slayerId = match.getPlayerId(slayer);
            match.getEventBus().subscribe(GameEventBus.EventType.CARD_DRAWN, event -> {
                Card drawn = (Card) event.payload();
                if (slayerId.equals(event.playerId()) && drawn.getType() == CardType.MAGIC) {
                    match.playCardImmediately(slayer, drawn);
                }
            });
        };
        return new MonsterCard(id, "Orthus", classPlusAny(HeroClass.WIZARD), "Wizard + 1 any", 4, new DiscardEffect(2), 8, reward);
    }

    public static MonsterCard rexMajor(Long id) {
        MonsterReward reward = (match, slayer) -> {
            String slayerId = match.getPlayerId(slayer);
            match.getEventBus().subscribe(GameEventBus.EventType.CARD_DRAWN, event -> {
                Card drawn = (Card) event.payload();
                if (slayerId.equals(event.playerId()) && drawn.getType() == CardType.MODIFIER) {
                    match.drawCard(slayer);
                }
            });
        };
        return new MonsterCard(id, "Rex Major", classPlusAny(HeroClass.GUARDIAN), "Guardian + 1 any", 4, new DiscardEffect(2), 8, reward);
    }

    public static MonsterCard terratuga(Long id) {
        return new MonsterCard(id, "Terratuga", anyHeroes(1), "Any 1 hero", 7, new SacrificeEffect(), 11,
                (match, slayer) -> slayer.setHeroesPermanentlyProtectedFromDestroy(true));
    }

    public static MonsterCard titanWyvern(Long id) {
        return new MonsterCard(id, "Titan Wyvern", classPlusAny(HeroClass.FIGHTER), "Fighter + 1 any", 4, new DiscardEffect(2), 8,
                (match, slayer) -> slayer.addPermanentRollBonus(1, "Titan Wyvern (Slain)"));
    }

    public static MonsterCard warwornOwlbear(Long id) {
        return new MonsterCard(id, "Warworn Owlbear", classPlusAny(HeroClass.THIEF), "Thief + 1 any", 4, new DiscardEffect(2), 8,
                (match, slayer) -> slayer.setItemsPermanentlyUnchallengeable(true));
    }
}
