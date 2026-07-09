package org.br.heretoslay.entity.Card;

import java.util.List;

public class ModifierFactory {

    public static ModifierCard plusOneMinusThree(Long id) {
        return new ModifierCard(id, "Modifier +1/-3", List.of(1, -3));
    }

    public static ModifierCard plusTwoMinusTwo(Long id) {
        return new ModifierCard(id, "Modifier +2/-2", List.of(2, -2));
    }

    public static ModifierCard plusThreeMinusOne(Long id) {
        return new ModifierCard(id, "Modifier +3/-1", List.of(3, -1));
    }

    public static ModifierCard plusFour(Long id) {
        return new ModifierCard(id, "Modifier +4", List.of(4));
    }

    public static ModifierCard minusFour(Long id) {
        return new ModifierCard(id, "Modifier -4", List.of(-4));
    }
}
