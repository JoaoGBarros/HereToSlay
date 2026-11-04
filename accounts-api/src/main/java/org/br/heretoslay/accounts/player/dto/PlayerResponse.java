package org.br.heretoslay.accounts.player.dto;

import org.br.heretoslay.accounts.player.Platform;
import org.br.heretoslay.accounts.player.Player;
import org.br.heretoslay.accounts.player.PlayerStats;

import java.time.Instant;
import java.util.UUID;

/** A player's profile and stats. Never carries the Firebase uid or anything from the sign-in account. */
public record PlayerResponse(
        UUID id,
        String username,
        Instant createdAt,
        Platform createdPlatform,
        Platform lastLoginPlatform,
        Instant lastLoginAt,
        Stats stats) {

    public record Stats(
            int matchesPlayed,
            int wins,
            int losses,
            int winsByClasses,
            int winsByMonsters,
            int monstersSlainTotal) {

        static Stats from(PlayerStats stats) {
            return new Stats(stats.getMatchesPlayed(), stats.getWins(), stats.getLosses(),
                    stats.getWinsByClasses(), stats.getWinsByMonsters(), stats.getMonstersSlainTotal());
        }
    }

    public static PlayerResponse from(Player player) {
        return new PlayerResponse(player.getId(), player.getUsername(), player.getCreatedAt(),
                player.getCreatedPlatform(), player.getLastLoginPlatform(), player.getLastLoginAt(),
                Stats.from(player.getStats()));
    }
}
