package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

/**
 * Applied once when a player slays a Monster. Static rewards (permanent roll
 * buff, extra AP, protection status) just mutate the slayer's GameState here.
 * Reactive rewards additionally subscribe a listener on match.getEventBus()
 * scoped to the slayer's playerId, since they trigger later in response to
 * other game events (a card drawn, a modifier played, etc).
 */
public interface MonsterReward {
    void onSlain(Match match, GameState slayer);
}
