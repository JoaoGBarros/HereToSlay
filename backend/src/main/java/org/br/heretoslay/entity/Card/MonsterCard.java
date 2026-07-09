package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.Card.CardEffects.CompositeCardEffect;
import org.br.heretoslay.entity.GameState;

import java.util.List;
import java.util.function.Predicate;

public class MonsterCard extends Card {

    private final Predicate<GameState> partyRequirement;
    private final String partyRequirementDescription;
    private final int fightBackThreshold;
    private final CardEffect fightBackPenalty;
    private final int slayThreshold;
    private final MonsterReward reward;

    public MonsterCard(Long cardId, String cardName, Predicate<GameState> partyRequirement,
                        String partyRequirementDescription, int fightBackThreshold, CardEffect fightBackPenalty,
                        int slayThreshold, MonsterReward reward) {
        super(cardId, cardName, CardType.MONSTER, new CompositeCardEffect(List.of()));
        this.partyRequirement = partyRequirement;
        this.partyRequirementDescription = partyRequirementDescription;
        this.fightBackThreshold = fightBackThreshold;
        this.fightBackPenalty = fightBackPenalty;
        this.slayThreshold = slayThreshold;
        this.reward = reward;
    }

    public boolean meetsPartyRequirement(GameState gameState) {
        return partyRequirement.test(gameState);
    }

    public String getPartyRequirementDescription() {
        return partyRequirementDescription;
    }

    public int getFightBackThreshold() {
        return fightBackThreshold;
    }

    public CardEffect getFightBackPenalty() {
        return fightBackPenalty;
    }

    public int getSlayThreshold() {
        return slayThreshold;
    }

    public MonsterReward getReward() {
        return reward;
    }
}
