package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.br.heretoslay.entity.Card.DestroyCardEffect;
import org.java_websocket.WebSocket;

import java.util.Collections;
import java.util.List;
import java.util.Map;

public class HeroCard extends Card {
    private int diceValue;

    public HeroCard(Long cardId, String cardName, CardType type, CompositeCardEffect effect) {
        super(cardId, cardName, type, effect);
        this.diceValue = 2;
    }


    public int getDiceValue() {
        return diceValue;
    }

    public void applyEffect(Match match, GameState gameState) {
        if (this.getEffect() != null) {
            this.getEffect().applyEffect(match, gameState);
        }
    }

    public boolean checkForSelectableEffect() {
        CompositeCardEffect effect = this.getEffect();
        if (effect != null) {
            for (CardEffect subEffect : effect.getEffects()) {
                if (subEffect instanceof DestroyCardEffect) {
                    return true;
                }
            }
        }
        return false;
    }

    public Map<String, List<Long>> addTarget(Long cardId, String userId) {
        CompositeCardEffect effect = this.getEffect();
        Map<String, List<Long>> targets = null;
        if (effect != null) {
            for (CardEffect subEffect : effect.getEffects()) {
                if (subEffect instanceof DestroyCardEffect) {
                    targets = ((DestroyCardEffect) subEffect).addTarget(userId, cardId);
                }
            }
        }

        return targets;
    }

    public Map<String, List<Long>>  removeTarget(Long cardId, String userId) {
        CompositeCardEffect effect = this.getEffect();
        if (effect != null) {
            for (CardEffect subEffect : effect.getEffects()) {
                if (subEffect instanceof DestroyCardEffect) {
                    return ((DestroyCardEffect) subEffect).removeTarget(userId, cardId);
                }
            }
        }
        return Collections.emptyMap();
    }

    public Integer getMaxDestroy() {
        CompositeCardEffect effect = this.getEffect();
        if (effect != null) {
            for (CardEffect subEffect : effect.getEffects()) {
                if (subEffect instanceof DestroyCardEffect) {
                    return ((DestroyCardEffect) subEffect).getMaxDestroy();
                }
            }
        }
        return null;
    }

}