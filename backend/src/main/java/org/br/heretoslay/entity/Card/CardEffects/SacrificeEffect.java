package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.Card;
import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.Card.CardType;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.json.JSONObject;

import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

/**
 * The affected player loses one of their own Hero cards. The physical game lets
 * that player choose which one; here it is picked at random from their party as
 * an MVP simplification (no extra selection UI round-trip for the losing side).
 */
public class SacrificeEffect implements CardEffect {

    @Override
    public void applyEffect(Match match, GameState gameState) {
        if (gameState.isHeroesProtectedFromDestroy()) return;

        List<Card> heroes = gameState.getParty().stream()
                .filter(c -> c.getType() == CardType.HERO)
                .collect(Collectors.toList());
        if (heroes.isEmpty()) return;

        Card sacrificed = heroes.get(new Random().nextInt(heroes.size()));
        gameState.getParty().remove(sacrificed);
        match.getDiscardPile().add(sacrificed);

        JSONObject animation = new JSONObject();
        animation.put("type", "animation");
        animation.put("subtype", "destroy_card");
        animation.put("payload", new JSONObject()
                .put("targetPlayerId", match.getPlayerId(gameState))
                .put("cardId", sacrificed.getCardId())
        );
        match.broadcast(animation.toString());
    }
}
