package org.br.heretoslay.entity;

import org.br.heretoslay.entity.Card.Card;

import java.util.ArrayList;
import java.util.List;

public class GameState {

    private PartyLeader leader;
    private List<Card> party;
    private List<Card> hand;
    private int maxAP;
    private int currentAP;
    private String username;
    private Integer orderRoll = null;
    private Card pendingHeroCard;
    private int lastRoll = 0;

    public GameState(String username) {
        this.maxAP = 3;
        this.hand = new ArrayList<>();
        this.party = new ArrayList<>();
        this.currentAP = this.maxAP;
        this.username = username;
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

    public int getLastRoll() {
        return lastRoll;
    }

    public void setLastRoll(int lastRoll) {
        this.lastRoll = lastRoll;
    }

}
