package org.br.heretoslay.accounts.player.dto;

/** What a username may look like: 3 to 20 letters, digits or underscores. */
public final class UsernameRules {

    public static final String PATTERN = "^[A-Za-z0-9_]{3,20}$";
    public static final String MESSAGE = "must be 3 to 20 letters, digits or underscores";

    private UsernameRules() {
    }
}
