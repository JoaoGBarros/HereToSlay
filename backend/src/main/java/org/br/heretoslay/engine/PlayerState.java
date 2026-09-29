package org.br.heretoslay.engine;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** Everything one player owns: hand, party, slain monsters, action points and temporary statuses. */
public class PlayerState {

    public static final int BASE_ACTION_POINTS = 3;

    private final String id;
    private final String username;
    private HeroClass leader;
    private final List<GameCard> hand = new ArrayList<>();
    private final List<GameCard> party = new ArrayList<>();
    private final List<Monster> slain = new ArrayList<>();
    private int actionPoints;
    private Integer orderRoll;
    private int[] orderDice;
    private final Set<Long> usedHeroes = new HashSet<>();
    private boolean leaderSkillUsed;
    /** Why the player is out of the match (no_show, disconnected, surrender), or null while playing. */
    private String leftReason;

    // "Until the end of your turn"
    private int turnRollBonus;
    private final List<String> turnBonusSources = new ArrayList<>();
    private boolean unchallengeableThisTurn;

    // "Until your next turn"
    private boolean protectedFromSteal;
    private boolean protectedFromDestroy;

    public PlayerState(String id, String username) {
        this.id = id;
        this.username = username;
    }

    public String getId() { return id; }
    public String getUsername() { return username; }
    public HeroClass getLeader() { return leader; }
    public void setLeader(HeroClass leader) { this.leader = leader; }
    public List<GameCard> getHand() { return hand; }
    public List<GameCard> getParty() { return party; }
    public List<Monster> getSlain() { return slain; }
    public int getActionPoints() { return actionPoints; }
    public void setActionPoints(int actionPoints) { this.actionPoints = Math.max(0, actionPoints); }
    public void spend(int points) { setActionPoints(actionPoints - points); }
    public Integer getOrderRoll() { return orderRoll; }
    public void setOrderRoll(Integer orderRoll, int[] dice) {
        this.orderRoll = orderRoll;
        this.orderDice = dice;
    }
    public Set<Long> getUsedHeroes() { return usedHeroes; }
    public boolean isLeaderSkillUsed() { return leaderSkillUsed; }
    public void setLeaderSkillUsed(boolean used) { this.leaderSkillUsed = used; }
    public int getTurnRollBonus() { return turnRollBonus; }
    public List<String> getTurnBonusSources() { return turnBonusSources; }
    public boolean isUnchallengeableThisTurn() { return unchallengeableThisTurn; }
    public void setUnchallengeableThisTurn(boolean value) { this.unchallengeableThisTurn = value; }
    public void setProtectedFromSteal(boolean value) { this.protectedFromSteal = value; }
    public void setProtectedFromDestroy(boolean value) { this.protectedFromDestroy = value; }

    public void addTurnBonus(int amount, String source) {
        turnRollBonus += amount;
        turnBonusSources.add(source);
    }

    public List<GameCard> heroes() {
        return party.stream().filter(c -> c.is(GameCard.Kind.HERO)).toList();
    }

    public boolean has(Monster.Reward reward) {
        return slain.stream().anyMatch(m -> m.getReward() == reward);
    }

    public boolean canHeroBeStolen() {
        return !protectedFromSteal;
    }

    public boolean canHeroBeDestroyed() {
        return !protectedFromDestroy && !has(Monster.Reward.TERRATUGA);
    }

    /** Distinct classes in the party, Party Leader included (6 = full party). */
    public Set<HeroClass> classes() {
        Set<HeroClass> classes = new LinkedHashSet<>();
        if (leader != null) classes.add(leader);
        heroes().forEach(h -> classes.add(h.effectiveClass()));
        return classes;
    }

    public void onTurnStart() {
        protectedFromSteal = false;
        protectedFromDestroy = false;
        leaderSkillUsed = false;
        usedHeroes.clear();
        setActionPoints(BASE_ACTION_POINTS + (has(Monster.Reward.MEGA_SLIME) ? 1 : 0));
    }

    public void onTurnEnd() {
        turnRollBonus = 0;
        turnBonusSources.clear();
        unchallengeableThisTurn = false;
        usedHeroes.clear();
    }

    public GameCard findInHand(long cardId) {
        return hand.stream().filter(c -> c.getId() == cardId).findFirst().orElse(null);
    }

    public GameCard findInParty(long cardId) {
        return party.stream().filter(c -> c.getId() == cardId).findFirst().orElse(null);
    }

    public long count(GameCard.Kind kind) {
        return hand.stream().filter(c -> c.is(kind)).count();
    }

    /** @param full true for the owner (sees the hand), false for everyone else (card backs only). */
    public boolean isGone() { return leftReason != null; }
    public String getLeftReason() { return leftReason; }
    public void leave(String reason) { this.leftReason = reason; }

    public JSONObject toJson(boolean full) {
        JSONArray handJson = new JSONArray();
        hand.forEach(c -> handJson.put(full ? c.toJson() : c.hiddenJson()));
        JSONArray partyJson = new JSONArray();
        party.forEach(c -> partyJson.put(c.toJson()));
        JSONArray slainJson = new JSONArray();
        slain.forEach(m -> slainJson.put(m.toJson()));
        JSONObject json = new JSONObject()
                .put("username", username)
                .put("leader", leader == null ? "" : leader.name())
                .put("hand", handJson)
                .put("handCount", hand.size())
                .put("party", partyJson)
                .put("slain", slainJson)
                .put("currentAP", actionPoints)
                .put("maxAP", BASE_ACTION_POINTS + (has(Monster.Reward.MEGA_SLIME) ? 1 : 0))
                .put("orderRoll", orderRoll == null ? JSONObject.NULL : orderRoll)
                .put("usedCardIds", new JSONArray(usedHeroes))
                .put("leaderSkillUsed", leaderSkillUsed)
                .put("rollBonusUntilEndOfTurn", turnRollBonus)
                .put("rollBonusSources", new JSONArray(turnBonusSources))
                .put("protectedFromSteal", protectedFromSteal)
                .put("protectedFromDestroy", !canHeroBeDestroyed())
                .put("unchallengeable", unchallengeableThisTurn)
                .put("leftReason", leftReason == null ? JSONObject.NULL : leftReason);
        if (orderDice != null) json.put("orderDice", new JSONArray(orderDice));
        return json;
    }
}
