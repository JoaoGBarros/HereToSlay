package org.br.heretoslay.engine;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.br.heretoslay.engine.Monster.Penalty.DISCARD_TWO;
import static org.br.heretoslay.engine.Monster.Penalty.SACRIFICE_HERO;

/** The 15 base-game Monsters (requirements and roll ranges as printed; Dracos uses 5-/8+ like the others). */
public final class MonsterCatalog {

    private MonsterCatalog() {}

    public static List<Monster> shuffledDeck() {
        long id = 9000;
        List<Monster> monsters = new ArrayList<>(List.of(
                new Monster(++id, "Abyss Queen", 2, null, 5, 8, SACRIFICE_HERO, Monster.Reward.ABYSS_QUEEN),
                new Monster(++id, "Anuran Cauldron", 3, null, 6, 7, SACRIFICE_HERO, Monster.Reward.ANURAN_CAULDRON),
                new Monster(++id, "Artic Aries", 1, null, 6, 10, SACRIFICE_HERO, Monster.Reward.ARTIC_ARIES),
                new Monster(++id, "Bloodwing", 2, null, 6, 9, SACRIFICE_HERO, Monster.Reward.BLOODWING),
                new Monster(++id, "Corrupted Sabretooth", 3, null, 6, 9, SACRIFICE_HERO, Monster.Reward.CORRUPTED_SABRETOOTH),
                new Monster(++id, "Crowned Serpent", 2, null, 7, 10, SACRIFICE_HERO, Monster.Reward.CROWNED_SERPENT),
                new Monster(++id, "Dark Dragon King", 1, HeroClass.BARD, 4, 8, DISCARD_TWO, Monster.Reward.DARK_DRAGON_KING),
                new Monster(++id, "Dracos", 1, null, 5, 8, SACRIFICE_HERO, Monster.Reward.DRACOS),
                new Monster(++id, "Malamammoth", 1, HeroClass.RANGER, 4, 8, DISCARD_TWO, Monster.Reward.MALAMAMMOTH),
                new Monster(++id, "Mega Slime", 4, null, 7, 8, SACRIFICE_HERO, Monster.Reward.MEGA_SLIME),
                new Monster(++id, "Orthus", 1, HeroClass.WIZARD, 4, 8, DISCARD_TWO, Monster.Reward.ORTHUS),
                new Monster(++id, "Rex Major", 1, HeroClass.GUARDIAN, 4, 8, DISCARD_TWO, Monster.Reward.REX_MAJOR),
                new Monster(++id, "Terratuga", 1, null, 7, 11, SACRIFICE_HERO, Monster.Reward.TERRATUGA),
                new Monster(++id, "Titan Wyvern", 1, HeroClass.FIGHTER, 4, 8, DISCARD_TWO, Monster.Reward.TITAN_WYVERN),
                new Monster(++id, "Warworn Owlbear", 1, HeroClass.THIEF, 4, 8, DISCARD_TWO, Monster.Reward.WARWORN_OWLBEAR)
        ));
        Collections.shuffle(monsters);
        return monsters;
    }
}
