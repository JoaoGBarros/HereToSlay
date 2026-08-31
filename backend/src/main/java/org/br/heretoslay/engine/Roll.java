package org.br.heretoslay.engine;

import org.json.JSONArray;
import org.json.JSONObject;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

/** One 2d6 roll: dice rolled by the server, passive bonuses, and the Modifiers played on it. */
public class Roll {

    public enum Kind { HERO, ATTACK, CHALLENGE }

    private static final SecureRandom RANDOM = new SecureRandom();

    private final String id;
    private final Kind kind;
    private final String rollerId;
    private final GameCard card;
    private final Monster monster;
    private final List<JSONObject> bonuses = new ArrayList<>();
    private final List<JSONObject> modifiers = new ArrayList<>();
    private int[] dice;
    private String outcome;

    public Roll(String id, Kind kind, String rollerId, GameCard card, Monster monster) {
        this.id = id;
        this.kind = kind;
        this.rollerId = rollerId;
        this.card = card;
        this.monster = monster;
    }

    public static int[] throwDice() {
        return new int[]{RANDOM.nextInt(6) + 1, RANDOM.nextInt(6) + 1};
    }

    public String getId() { return id; }
    public Kind getKind() { return kind; }
    public String getRollerId() { return rollerId; }
    public GameCard getCard() { return card; }
    public Monster getMonster() { return monster; }
    public boolean isRolled() { return dice != null; }
    public void setOutcome(String outcome) { this.outcome = outcome; }

    public void roll() {
        dice = throwDice();
    }

    public void addBonus(String label, int value) {
        if (value != 0) bonuses.add(new JSONObject().put("label", label).put("value", value));
    }

    public void addModifier(String playerId, int value, String label) {
        modifiers.add(new JSONObject().put("playerId", playerId).put("value", value).put("label", label == null ? "" : label));
    }

    public int total() {
        if (dice == null) return 0;
        int sum = dice[0] + dice[1];
        for (JSONObject b : bonuses) sum += b.getInt("value");
        for (JSONObject m : modifiers) sum += m.getInt("value");
        return sum;
    }

    public JSONObject toJson() {
        JSONObject json = new JSONObject()
                .put("rollId", id)
                .put("kind", kind.name())
                .put("rollerId", rollerId)
                .put("bonuses", new JSONArray(bonuses))
                .put("modifiers", new JSONArray(modifiers));
        if (card != null) json.put("card", card.toJson());
        if (monster != null) json.put("monster", monster.toJson());
        if (dice != null) json.put("dice", new JSONArray(dice)).put("total", total());
        if (outcome != null) json.put("outcome", outcome);
        return json;
    }
}
