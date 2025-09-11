package org.br.heretoslay.entity.Card;

import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.java_websocket.WebSocket;

public class HeroCard extends Card {
    private int diceValue;
    // outros atributos específicos

    public HeroCard(Long cardId, String cardName, int diceValue) {
        super(cardId, cardName, CardType.HERO);
        this.diceValue = diceValue;
    }

    @Override
    public void applyEffect(Match match, GameState gameState) {
        //gameState.setUsername("PINTO GROSSO GOSTOSO VEIUDO PULSANDO");
    }

    public int getDiceValue() {
        return diceValue;
    }


}