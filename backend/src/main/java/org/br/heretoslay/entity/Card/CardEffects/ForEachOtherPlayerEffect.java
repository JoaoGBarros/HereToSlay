package org.br.heretoslay.entity.Card.CardEffects;

import org.br.heretoslay.entity.Card.CardEffect;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

public class ForEachOtherPlayerEffect implements CardEffect {

    private final CardEffect effectPerPlayer;

    public ForEachOtherPlayerEffect(CardEffect effectPerPlayer) {
        this.effectPerPlayer = effectPerPlayer;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        for (GameState other : match.getPlayers().values()) {
            if (other == gameState) continue;
            effectPerPlayer.applyEffect(match, other);
        }
    }
}
