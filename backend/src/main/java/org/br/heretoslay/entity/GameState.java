package org.br.heretoslay.entity;

import org.br.heretoslay.entity.Card.Card;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class GameState {

    private PartyLeader leader;
    private List<Card> party;
    private List<Card> hand;
    private int maxAP;
    private int currentAP;
    private String username;
    private Integer orderRoll = null;
    private Card pendingHeroCard;
    private Integer lastRoll = null;
    private UUID playerId;
    private List<Long> usedCardIds = new ArrayList<>();
    private List<Card> lastDrawnCards = new ArrayList<>();
    private int rollBonusUntilEndOfTurn = 0;
    private int permanentRollBonus = 0;
    private final List<String> rollBonusSources = new ArrayList<>();
    private final List<String> permanentRollBonusSources = new ArrayList<>();
    private boolean heroesProtectedFromDestroy = false;
    private boolean heroesProtectedFromSteal = false;
    private boolean heroesPermanentlyProtectedFromDestroy = false;
    private boolean cardsUnchallengeableThisTurn = false;
    private boolean itemsPermanentlyUnchallengeable = false;
    private int permanentExtraActionPoints = 0;

    public GameState(String username, UUID playerId) {
        this.maxAP = 3;
        this.hand = new ArrayList<>();
        this.party = new ArrayList<>();
        this.currentAP = this.maxAP;
        this.username = username;
        this.playerId = playerId;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public PartyLeader getLeader() {
        return leader;
    }

    public List<Card> getParty() {
        return party;
    }

    public List<Card> getHand() {
        return hand;
    }

    public int getMaxAP() {
        return maxAP;
    }

    public int getCurrentAP() {
        return currentAP;

    }

    public String getUsername() {
        return username;
    }

    public void setCurrentAP(int currentAP) {
        this.currentAP = currentAP;
    }

    public void setMaxAP(int maxAP) {
        this.maxAP = maxAP;
    }

    public void setLeader(PartyLeader leader) {
        this.leader = leader;
    }

    public Integer getOrderRoll() {
        return orderRoll;
    }

    public void setOrderRoll(Integer orderRoll) {
        this.orderRoll = orderRoll;
    }

    public void resetOrderRoll() {
        this.orderRoll = null;
    }

    public Card getPendingHeroCard() {
        return pendingHeroCard;
    }

    public void setPendingHeroCard(Card card) {
        this.pendingHeroCard = card;
    }

    public Integer getLastRoll() {
        return lastRoll;
    }

    public void setLastRoll(Integer lastRoll) {
        this.lastRoll = lastRoll;
    }

    public UUID getPlayerId() {
        return playerId;
    }

    public List<Long> getUsedCardIds() {
        return usedCardIds;
    }

    public void setHand(List<Card> hand) {
        this.hand = hand;
    }

    public List<Card> getLastDrawnCards() {
        return lastDrawnCards;
    }

    public void clearLastDrawnCards() {
        lastDrawnCards.clear();
    }

    public void addLastDrawnCard(Card card) {
        lastDrawnCards.add(card);
    }

    public int getRollBonusUntilEndOfTurn() {
        return rollBonusUntilEndOfTurn;
    }

    public void addRollBonusUntilEndOfTurn(int amount) {
        addRollBonusUntilEndOfTurn(amount, "Card effect");
    }

    public void addRollBonusUntilEndOfTurn(int amount, String source) {
        this.rollBonusUntilEndOfTurn += amount;
        this.rollBonusSources.add(formatBonusLabel(source, amount));
    }

    public void clearRollBonusUntilEndOfTurn() {
        this.rollBonusUntilEndOfTurn = 0;
        this.rollBonusSources.clear();
    }

    public List<String> getRollBonusSources() {
        return rollBonusSources;
    }

    public int getPermanentRollBonus() {
        return permanentRollBonus;
    }

    public void addPermanentRollBonus(int amount) {
        addPermanentRollBonus(amount, "Card effect");
    }

    public void addPermanentRollBonus(int amount, String source) {
        this.permanentRollBonus += amount;
        this.permanentRollBonusSources.add(formatBonusLabel(source, amount));
    }

    public List<String> getPermanentRollBonusSources() {
        return permanentRollBonusSources;
    }

    private static String formatBonusLabel(String source, int amount) {
        return source + " (" + (amount >= 0 ? "+" : "") + amount + ")";
    }

    public boolean isHeroesProtectedFromDestroy() {
        return heroesProtectedFromDestroy || heroesPermanentlyProtectedFromDestroy;
    }

    public void setHeroesProtectedFromDestroy(boolean value) {
        this.heroesProtectedFromDestroy = value;
    }

    public void setHeroesPermanentlyProtectedFromDestroy(boolean value) {
        this.heroesPermanentlyProtectedFromDestroy = value;
    }

    public boolean isHeroesProtectedFromSteal() {
        return heroesProtectedFromSteal;
    }

    public void setHeroesProtectedFromSteal(boolean value) {
        this.heroesProtectedFromSteal = value;
    }

    public boolean isCardsUnchallengeableThisTurn() {
        return cardsUnchallengeableThisTurn;
    }

    public void setCardsUnchallengeableThisTurn(boolean value) {
        this.cardsUnchallengeableThisTurn = value;
    }

    public boolean isItemsPermanentlyUnchallengeable() {
        return itemsPermanentlyUnchallengeable;
    }

    public void setItemsPermanentlyUnchallengeable(boolean value) {
        this.itemsPermanentlyUnchallengeable = value;
    }

    public void clearEndOfTurnStatuses() {
        clearRollBonusUntilEndOfTurn();
        this.cardsUnchallengeableThisTurn = false;
    }

    public void clearStartOfTurnStatuses() {
        this.heroesProtectedFromDestroy = false;
        this.heroesProtectedFromSteal = false;
    }

    public int getPermanentExtraActionPoints() {
        return permanentExtraActionPoints;
    }

    public void addPermanentExtraActionPoints(int amount) {
        this.permanentExtraActionPoints += amount;
    }

}
