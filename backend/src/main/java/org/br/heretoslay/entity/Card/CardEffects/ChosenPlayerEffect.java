package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.UUID;

public class ChosenPlayerEffect implements CardEffect {

    private final CardEffect effectOnChosenPlayer;
    private String playerSelected;

    public ChosenPlayerEffect(CardEffect effectOnChosenPlayer) {
        this.effectOnChosenPlayer = effectOnChosenPlayer;
    }

    public void setPlayerSelected(String playerSelected) {
        this.playerSelected = playerSelected;
    }

    public String getPlayerSelected() {
        return playerSelected;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        if (playerSelected == null) {
            throw new IllegalArgumentException("PlayerSelected is null");
        }

        GameState targetState = match.getPlayers().values().stream()
                .filter(gs -> UUID.nameUUIDFromBytes(gs.getUsername().getBytes()).toString().equals(playerSelected))
                .findFirst()
                .orElse(null);

        if (targetState == null) {
            throw new IllegalArgumentException("PlayerSelected is not connected/does not exist");
        }

        effectOnChosenPlayer.applyEffect(match, targetState);
    }
}
