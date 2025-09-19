package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.json.JSONObject;

import java.util.*;

public class StealCardEffect implements CardEffect {

    private Integer maxSteal;
    private final Map<String, List<Long>> playerIdToCardId;


    public StealCardEffect(Integer maxSteal, Map<String, List<Long>> playerIdToCardId) {
        this.maxSteal = maxSteal;
        this.playerIdToCardId = playerIdToCardId;
    }

    public Integer getMaxSteal() {
        return maxSteal;
    }

    public Map<String, List<Long>> getPlayerIdToCardId() {
        return playerIdToCardId;
    }

    public Map<String, List<Long>> addTarget(String playerId, Long cardId) {

        if(!playerIdToCardId.containsKey(playerId)){
            playerIdToCardId.put(playerId, new ArrayList<>());
        }

        if (playerIdToCardId.values().stream().mapToInt(List::size).sum() < maxSteal) {
            playerIdToCardId.get(playerId).add(cardId);
        }

        return playerIdToCardId;
    }

    public boolean isReady() {
        return playerIdToCardId.size() == maxSteal;
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

        if (playerIdToCardId.size() > maxSteal) {
            throw new IllegalArgumentException("Cannot destroy more than " + maxSteal + " cards.");
        }

        if (playerIdToCardId.size() == maxSteal) {
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
                            JSONObject animaton = new JSONObject();
                            animaton.put("type", "animation");
                            animaton.put("subtype", "steal_card");
                            animaton.put("payload", new JSONObject()
                                    .put("targetPlayerId", playerId)
                                    .put("cardId", cardId)
                            );
                            match.broadcast(animaton.toString());
                            targetState.getParty().remove(card);
                            gameState.getParty().add(card);
                        });
                    }
                }
            }
        }

        playerIdToCardId.clear();
    }
}
