package org.br.heretoslay.engine;

public enum HeroClass {
    BARD, FIGHTER, GUARDIAN, RANGER, THIEF, WIZARD;

    public static HeroClass parse(String value) {
        if (value == null) return null;
        try {
            return valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
