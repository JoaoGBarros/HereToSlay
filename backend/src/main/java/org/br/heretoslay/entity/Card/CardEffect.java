package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

public interface CardEffect {

    void applyEffect(Match match, GameState gameState);
}
