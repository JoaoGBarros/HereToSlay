package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.Card.CardEffects.*;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;

import java.util.Collections;
import java.util.List;
import java.util.Map;

public class HeroCard extends Card {
    private final int diceValue;
    private final HeroClass heroClass;

    public HeroCard(Long cardId, String cardName, CardType type, HeroClass heroClass, int diceValue, CompositeCardEffect effect) {
        super(cardId, cardName, type, effect);
        this.heroClass = heroClass;
        this.diceValue = diceValue;
    }

    public int getDiceValue() {
        return diceValue;
    }

    public HeroClass getHeroClass() {
        return heroClass;
    }

    public void applyEffect(Match match, GameState gameState) {
        if (this.getEffect() != null) {
            this.getEffect().applyEffect(match, gameState);
        }
    }

    public DiscardForEffect getDiscardForEffect() {
        CompositeCardEffect effect = this.getEffect();
        if (effect != null) {
            for (CardEffect subEffect : effect.getEffects()) {
                if (subEffect instanceof DiscardForEffect) {
                    return (DiscardForEffect) subEffect;
                }
            }
        }
        return null;
    }

    public boolean checkForSelectablePartyEffect() {
        CompositeCardEffect effect = this.getEffect();
        if (effect != null) {
            for (CardEffect subEffect : effect.getEffects()) {
                if (subEffect instanceof DestroyCardEffect || subEffect instanceof StealCardEffect
                        || subEffect instanceof SwapSelfForStolenHeroEffect || subEffect instanceof StealAndUseEffectImmediatelyEffect) {
                    return true;
                }
            }
        }
        return false;
    }

    public boolean checkForSelectableHandEffect() {
        CompositeCardEffect effect = this.getEffect();
        if (effect != null) {
            for (CardEffect subEffect : effect.getEffects()) {
                if (subEffect instanceof StealHandEffect || subEffect instanceof StealHandWithBonusIfTypeEffect) {
                    return true;
                }
            }
        }
        return false;
    }

    public boolean checkForSelectablePlayerEffect() {
        CompositeCardEffect effect = this.getEffect();
        if (effect != null) {
            for (CardEffect subEffect : effect.getEffects()) {
                if (subEffect instanceof TradeHandEffect || subEffect instanceof ChosenPlayerEffect || subEffect instanceof LookAtHandEffect) {
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

                if (subEffect instanceof StealCardEffect) {
                    targets = ((StealCardEffect) subEffect).addTarget(userId, cardId);
                }

                if(subEffect instanceof StealHandEffect) {
                    targets = ((StealHandEffect) subEffect).addTarget(userId, cardId);
                }

                if (subEffect instanceof StealHandWithBonusIfTypeEffect) {
                    targets = ((StealHandWithBonusIfTypeEffect) subEffect).getPrimary().addTarget(userId, cardId);
                }

                if (subEffect instanceof SwapSelfForStolenHeroEffect) {
                    targets = ((SwapSelfForStolenHeroEffect) subEffect).getPrimary().addTarget(userId, cardId);
                }

                if (subEffect instanceof StealAndUseEffectImmediatelyEffect) {
                    targets = ((StealAndUseEffectImmediatelyEffect) subEffect).getPrimary().addTarget(userId, cardId);
                }
            }
        }

        return targets;
    }

    public String addTargetPlayer(String userId) {
        CompositeCardEffect effect = this.getEffect();
        String targetPlayerId = null;
        if (effect != null) {
            for (CardEffect subEffect : effect.getEffects()) {
                if (subEffect instanceof TradeHandEffect) {
                    ((TradeHandEffect) subEffect).setPlayerSelected(userId);
                    targetPlayerId = ((TradeHandEffect) subEffect).getPlayerSelected();
                }
                if (subEffect instanceof ChosenPlayerEffect) {
                    ((ChosenPlayerEffect) subEffect).setPlayerSelected(userId);
                    targetPlayerId = ((ChosenPlayerEffect) subEffect).getPlayerSelected();
                }
                if (subEffect instanceof LookAtHandEffect) {
                    ((LookAtHandEffect) subEffect).setPlayerSelected(userId);
                    targetPlayerId = ((LookAtHandEffect) subEffect).getPlayerSelected();
                }
            }
        }

        return targetPlayerId;
    }

    public String removeTargetPlayer(String userId) {
        CompositeCardEffect effect = this.getEffect();
        String targetPlayerId = null;
        if (effect != null) {
            for (CardEffect subEffect : effect.getEffects()) {
                if (subEffect instanceof TradeHandEffect) {
                    ((TradeHandEffect) subEffect).setPlayerSelected(null);
                    targetPlayerId = ((TradeHandEffect) subEffect).getPlayerSelected();
                }
                if (subEffect instanceof ChosenPlayerEffect) {
                    ((ChosenPlayerEffect) subEffect).setPlayerSelected(null);
                    targetPlayerId = ((ChosenPlayerEffect) subEffect).getPlayerSelected();
                }
                if (subEffect instanceof LookAtHandEffect) {
                    ((LookAtHandEffect) subEffect).setPlayerSelected(null);
                    targetPlayerId = ((LookAtHandEffect) subEffect).getPlayerSelected();
                }
            }
        }
        return targetPlayerId;
    }

    public Map<String, List<Long>>  removeTarget(Long cardId, String userId) {
        CompositeCardEffect effect = this.getEffect();
        if (effect != null) {
            for (CardEffect subEffect : effect.getEffects()) {
                if (subEffect instanceof DestroyCardEffect) {
                    return ((DestroyCardEffect) subEffect).removeTarget(userId, cardId);
                }

                if (subEffect instanceof StealCardEffect) {
                    return ((StealCardEffect) subEffect).removeTarget(userId, cardId);
                }

                if(subEffect instanceof StealHandEffect) {
                    return ((StealHandEffect) subEffect).removeTarget(userId, cardId);
                }

                if (subEffect instanceof StealHandWithBonusIfTypeEffect) {
                    return ((StealHandWithBonusIfTypeEffect) subEffect).getPrimary().removeTarget(userId, cardId);
                }

                if (subEffect instanceof SwapSelfForStolenHeroEffect) {
                    return ((SwapSelfForStolenHeroEffect) subEffect).getPrimary().removeTarget(userId, cardId);
                }

                if (subEffect instanceof StealAndUseEffectImmediatelyEffect) {
                    return ((StealAndUseEffectImmediatelyEffect) subEffect).getPrimary().removeTarget(userId, cardId);
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

                if(subEffect instanceof StealCardEffect) {
                    return ((StealCardEffect) subEffect).getMaxSteal();
                }

                if(subEffect instanceof StealHandEffect) {
                    return ((StealHandEffect) subEffect).getMaxCardsToSteal();
                }

                if (subEffect instanceof StealHandWithBonusIfTypeEffect) {
                    return ((StealHandWithBonusIfTypeEffect) subEffect).getPrimary().getMaxCardsToSteal();
                }

                if (subEffect instanceof SwapSelfForStolenHeroEffect) {
                    return ((SwapSelfForStolenHeroEffect) subEffect).getPrimary().getMaxSteal();
                }

                if (subEffect instanceof StealAndUseEffectImmediatelyEffect) {
                    return ((StealAndUseEffectImmediatelyEffect) subEffect).getPrimary().getMaxSteal();
                }
            }
        }
        return null;
    }

}
