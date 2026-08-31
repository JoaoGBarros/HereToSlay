package org.br.heretoslay.engine;

import org.json.JSONObject;

/** An oversized Monster card: party requirement, roll ranges, fight-back penalty and the skill it grants. */
public class Monster {

    public enum Penalty { SACRIFICE_HERO, DISCARD_TWO }

    public enum Reward {
        ABYSS_QUEEN, ANURAN_CAULDRON, ARTIC_ARIES, BLOODWING, CORRUPTED_SABRETOOTH, CROWNED_SERPENT,
        DARK_DRAGON_KING, DRACOS, MALAMAMMOTH, MEGA_SLIME, ORTHUS, REX_MAJOR, TERRATUGA, TITAN_WYVERN, WARWORN_OWLBEAR
    }

    private final long id;
    private final String name;
    private final int anyHeroes;
    private final HeroClass requiredClass;
    private final int fightBack;
    private final int slay;
    private final Penalty penalty;
    private final Reward reward;

    public Monster(long id, String name, int anyHeroes, HeroClass requiredClass, int fightBack, int slay, Penalty penalty, Reward reward) {
        this.id = id;
        this.name = name;
        this.anyHeroes = anyHeroes;
        this.requiredClass = requiredClass;
        this.fightBack = fightBack;
        this.slay = slay;
        this.penalty = penalty;
        this.reward = reward;
    }

    public long getId() { return id; }
    public String getName() { return name; }
    public int getFightBack() { return fightBack; }
    public int getSlay() { return slay; }
    public Penalty getPenalty() { return penalty; }
    public Reward getReward() { return reward; }

    /**
     * The Party Leader counts toward a class requirement but is not a Hero card.
     * A single Hero cannot satisfy both the class and the "any" slot.
     */
    public boolean meetsRequirement(PlayerState player) {
        int heroes = player.heroes().size();
        if (requiredClass == null) return heroes >= anyHeroes;
        if (player.getLeader() == requiredClass) return heroes >= 1;
        long ofClass = player.heroes().stream().filter(h -> h.effectiveClass() == requiredClass).count();
        return ofClass >= 1 && heroes >= 2;
    }

    /** Kept in the engine's English format; clients translate it. */
    public String requirementText() {
        if (requiredClass == null) return "Any " + anyHeroes + (anyHeroes == 1 ? " hero" : " heroes");
        String cls = requiredClass.name().charAt(0) + requiredClass.name().substring(1).toLowerCase();
        return cls + " + 1 any";
    }

    public JSONObject toJson() {
        return new JSONObject()
                .put("id", id)
                .put("name", name)
                .put("partyRequirement", requirementText())
                .put("fightBackThreshold", fightBack)
                .put("slayThreshold", slay)
                .put("penalty", penalty.name())
                .put("reward", reward.name());
    }
}
