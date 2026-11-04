package org.br.heretoslay.accounts.match;

/** How a match was won. */
public enum WinCondition {
    /** Six different classes in the winner's party. */
    CLASSES,
    /** Three monsters slain. */
    MONSTERS,
    /** Everyone else surrendered or dropped out. */
    LAST_STANDING
}
