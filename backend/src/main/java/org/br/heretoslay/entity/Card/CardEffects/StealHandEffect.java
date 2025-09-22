package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.json.JSONObject;

import java.util.*;

public class StealHandEffect implements CardEffect {

    private final Integer maxCardsToSteal;
    private final Map<String, List<Long>> playerIdToCardId;

    public StealHandEffect(Integer maxCardsToSteal, Map<String, List<Long>> playerIdToCardId) {
        this.maxCardsToSteal = maxCardsToSteal;
        this.playerIdToCardId = playerIdToCardId;
    }

    public Integer getMaxCardsToSteal() {return maxCardsToSteal;}

    public Map<String, List<Long>> getPlayerIdToCardId() {
        return playerIdToCardId;
    }

    public Map<String, List<Long>> addTarget(String playerId, Long cardId) {

        if(!playerIdToCardId.containsKey(playerId)){
            playerIdToCardId.put(playerId, new ArrayList<>());
        }

        if(playerIdToCardId.get(playerId).contains(cardId)){
            return playerIdToCardId;
        }

        if (playerIdToCardId.values().stream().mapToInt(List::size).sum() < maxCardsToSteal) {
            playerIdToCardId.get(playerId).add(cardId);
        }

        return playerIdToCardId;
    }

    public boolean isReady() {
        return playerIdToCardId.size() == maxCardsToSteal;
    }

    public Map<String, List<Long>> removeTarget(String playerId, Long cardId) {
        if(playerIdToCardId.containsKey(playerId)) {
            playerIdToCardId.get(playerId).remove(cardId);

            if(playerIdToCardId.get(playerId).isEmpty()){
                playerIdToCardId.remove(playerId);
            }


            return playerIdToCardId;
        }
        return Collections.emptyMap();
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        if (playerIdToCardId.size() > maxCardsToSteal) {
            throw new IllegalArgumentException("Cannot destroy more than " + maxCardsToSteal + " cards.");
        }

        for (Map.Entry<String, List<Long>> entry : playerIdToCardId.entrySet()) {
            String playerId = entry.getKey();
            List<Long> cardsId = entry.getValue();
            GameState targetState = match.getPlayers().values().stream()
                    .filter(gs -> UUID.nameUUIDFromBytes(gs.getUsername().getBytes()).toString().equals(playerId))
                    .findFirst()
                    .orElse(null);
            if (targetState != null) {
                for (Long cardId : cardsId) {
                    Optional<Card> cardOpt = targetState.getHand().stream()
                            .filter(c -> c.getCardId().equals(cardId))
                            .findFirst();
                    cardOpt.ifPresent(card -> {
                        targetState.getHand().remove(card);
                        gameState.getHand().add(card);
                    });
                }
            }
        }

        playerIdToCardId.clear();
    }
    }
