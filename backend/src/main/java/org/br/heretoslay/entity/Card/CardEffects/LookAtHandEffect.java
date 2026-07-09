package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.UUID;

/**
 * Reveals a chosen player's hand to the caster only. Broadcasts to the whole
 * match (the project has no single-player targeted send today) with the
 * viewer id included; the frontend only renders the reveal for that viewer.
 */
public class LookAtHandEffect implements CardEffect {

    private String playerSelected;

    public void setPlayerSelected(String playerSelected) {
        this.playerSelected = playerSelected;
    }

    public String getPlayerSelected() {
        return playerSelected;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        if (playerSelected == null) return;

        GameState targetState = match.getPlayers().values().stream()
                .filter(gs -> UUID.nameUUIDFromBytes(gs.getUsername().getBytes()).toString().equals(playerSelected))
                .findFirst()
                .orElse(null);
        if (targetState == null) return;

        JSONArray handIds = new JSONArray();
        targetState.getHand().forEach(card -> handIds.put(card.getCardId()));

        JSONObject reveal = new JSONObject();
        reveal.put("type", "match");
        reveal.put("subtype", "hand_revealed");
        reveal.put("payload", new JSONObject()
                .put("viewerPlayerId", gameState.getPlayerId().toString())
                .put("revealedPlayerUsername", targetState.getUsername())
                .put("cardIds", handIds));
        match.broadcast(reveal.toString());
    }
}
