package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.*;

public class DestroyCardEffect implements CardEffect {

    private Integer maxDestroy;
    private final Map<String, List<Long>> playerIdToCardId;


    public DestroyCardEffect(Integer maxDestroy, Map<String, List<Long>> playerIdToCardId) {
        this.maxDestroy = maxDestroy;
        this.playerIdToCardId = playerIdToCardId;
    }

    public Integer getMaxDestroy() {
        return maxDestroy;
    }

    public Map<String, List<Long>> getPlayerIdToCardId() {
        return playerIdToCardId;
    }

    public Map<String, List<Long>> addTarget(String playerId, Long cardId) {

        if(!playerIdToCardId.containsKey(playerId)){
            playerIdToCardId.put(playerId, new ArrayList<>());
        }

        if (playerIdToCardId.values().stream().mapToInt(List::size).sum() < maxDestroy) {
            playerIdToCardId.get(playerId).add(cardId);
        }

        return playerIdToCardId;
    }

    public boolean isReady() {
        return playerIdToCardId.size() == maxDestroy;
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

        if (playerIdToCardId.size() > maxDestroy) {
            throw new IllegalArgumentException("Cannot destroy more than " + maxDestroy + " cards.");
        }

        if (playerIdToCardId.size() == maxDestroy) {
            for (Map.Entry<String, List<Long>> entry : playerIdToCardId.entrySet()) {
                String playerId = entry.getKey();
                List<Long> cardsId = entry.getValue();
                GameState targetState = match.getPlayers().values().stream()
                        .filter(gs -> UUID.nameUUIDFromBytes(gs.getUsername().getBytes()).toString().equals(playerId))
                        .findFirst()
                        .orElse(null);
                if (targetState != null) {
                    for (Long cardId : cardsId) {
                        Optional<Card> cardOpt = targetState.getParty().stream()
                                .filter(c -> c.getCardId().equals(cardId))
                                .findFirst();
                        cardOpt.ifPresent(card -> {
                            targetState.getParty().remove(card);
                            match.getDiscardPile().add(card);
                        });
                    }
                }
            }
        }
    }
}
