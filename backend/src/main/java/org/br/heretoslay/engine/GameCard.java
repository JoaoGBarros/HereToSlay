package org.br.heretoslay.engine;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;

/**
 * One physical card of the main deck. Heroes can carry one equipped Item;
 * the Item travels with the Hero when it is stolen, destroyed or returned.
 */
public class GameCard {

    public enum Kind { HERO, ITEM, MAGIC, MODIFIER, CHALLENGE }

    public enum ItemEffect { NONE, MASK, DECOY_DOLL, RUSTY_COIN, BIG_RING, SNAKE_EYES, SEALING_KEY, SHINY_COIN }

    private final long id;
    private final String name;
    private final Kind kind;
    private final HeroClass heroClass;
    private final int dice;
    private final List<Integer> modifierValues;
    private final boolean cursed;
    private final ItemEffect itemEffect;
    private final HeroClass maskClass;
    private final Script script;
    private GameCard item;

    private GameCard(long id, String name, Kind kind, HeroClass heroClass, int dice, List<Integer> modifierValues,
                     boolean cursed, ItemEffect itemEffect, HeroClass maskClass, Script script) {
        this.id = id;
        this.name = name;
        this.kind = kind;
        this.heroClass = heroClass;
        this.dice = dice;
        this.modifierValues = modifierValues;
        this.cursed = cursed;
        this.itemEffect = itemEffect;
        this.maskClass = maskClass;
        this.script = script;
    }

    public static GameCard hero(long id, String name, HeroClass heroClass, int dice, Script script) {
        return new GameCard(id, name, Kind.HERO, heroClass, dice, List.of(), false, ItemEffect.NONE, null, script);
    }

    public static GameCard magic(long id, String name, Script script) {
        return new GameCard(id, name, Kind.MAGIC, null, 0, List.of(), false, ItemEffect.NONE, null, script);
    }

    public static GameCard item(long id, String name, boolean cursed, ItemEffect effect, HeroClass maskClass) {
        return new GameCard(id, name, Kind.ITEM, null, 0, List.of(), cursed, effect, maskClass, null);
    }

    public static GameCard modifier(long id, String name, List<Integer> values) {
        return new GameCard(id, name, Kind.MODIFIER, null, 0, values, false, ItemEffect.NONE, null, null);
    }

    public static GameCard challenge(long id) {
        return new GameCard(id, "Challenge", Kind.CHALLENGE, null, 0, List.of(), false, ItemEffect.NONE, null, null);
    }

    public long getId() { return id; }
    public String getName() { return name; }
    public Kind getKind() { return kind; }
    public int getDice() { return dice; }
    public List<Integer> getModifierValues() { return modifierValues; }
    public boolean isCursed() { return cursed; }
    public ItemEffect getItemEffect() { return itemEffect; }
    public Script getScript() { return script; }
    public GameCard getItem() { return item; }
    public void setItem(GameCard item) { this.item = item; }

    public boolean is(Kind other) { return kind == other; }

    public boolean hasItemEffect(ItemEffect effect) {
        return item != null && item.itemEffect == effect;
    }

    /** A Mask changes the Hero's class while it is equipped. */
    public HeroClass effectiveClass() {
        if (item != null && item.itemEffect == ItemEffect.MASK) return item.maskClass;
        return heroClass;
    }

    public JSONObject toJson() {
        JSONObject json = new JSONObject()
                .put("cardId", id)
                .put("cardName", name)
                .put("type", kind.name());
        if (kind == Kind.HERO) {
            json.put("heroClass", effectiveClass().name())
                    .put("baseClass", heroClass.name())
                    .put("diceValue", dice);
            if (item != null) json.put("item", item.toJson());
        }
        if (kind == Kind.MODIFIER) json.put("possibleValues", new JSONArray(modifierValues));
        if (kind == Kind.ITEM) {
            json.put("cursed", cursed);
            if (maskClass != null) json.put("maskClass", maskClass.name());
        }
        return json;
    }

    /** What other players see of a card in someone's hand. */
    public JSONObject hiddenJson() {
        return new JSONObject().put("cardId", id);
    }
}
