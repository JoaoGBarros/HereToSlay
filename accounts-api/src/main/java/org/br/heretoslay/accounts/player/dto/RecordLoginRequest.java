package org.br.heretoslay.accounts.player.dto;

import jakarta.validation.constraints.NotNull;
import org.br.heretoslay.accounts.player.Platform;

/** Sent on every sign-in so the profile knows where the player last played from. */
public record RecordLoginRequest(@NotNull Platform platform) {
}
