package org.br.heretoslay.accounts.player.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.br.heretoslay.accounts.player.Platform;

/** Sent once, right after the Firebase sign-up, to pick the in-game name. */
public record CreatePlayerRequest(
        @NotNull @Pattern(regexp = UsernameRules.PATTERN, message = UsernameRules.MESSAGE) String username,
        @NotNull Platform platform) {
}
