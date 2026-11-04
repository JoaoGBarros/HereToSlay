package org.br.heretoslay.accounts.player;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

/**
 * A player's profile. Sign-in itself (email, password, Google) lives in Firebase; this keeps the
 * game identity tied to the Firebase account: the username, where the account came from and the
 * player's lifetime stats.
 */
@Entity
@Table(name = "players")
public class Player {

    @Id
    private UUID id;

    @Column(name = "firebase_uid", nullable = false, unique = true, updatable = false, length = 128)
    private String firebaseUid;

    @Column(nullable = false, updatable = false, length = 20)
    private String username;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "created_platform", nullable = false, updatable = false, length = 16)
    private Platform createdPlatform;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_login_platform", nullable = false, length = 16)
    private Platform lastLoginPlatform;

    @Column(name = "last_login_at", nullable = false)
    private Instant lastLoginAt;

    @Embedded
    private PlayerStats stats;

    /** Guards the stats against two matches finishing for the same player at the same time. */
    @Version
    private long version;

    protected Player() {
    }

    public static Player register(String firebaseUid, String username, Platform platform, Instant now) {
        Player player = new Player();
        player.id = UUID.randomUUID();
        player.firebaseUid = firebaseUid;
        player.username = username;
        player.createdAt = now;
        player.createdPlatform = platform;
        player.lastLoginPlatform = platform;
        player.lastLoginAt = now;
        player.stats = PlayerStats.empty();
        return player;
    }

    public void recordLogin(Platform platform, Instant now) {
        this.lastLoginPlatform = platform;
        this.lastLoginAt = now;
    }

    public void recordMatch(MatchOutcome outcome) {
        stats.record(outcome);
    }

    public UUID getId() { return id; }
    public String getFirebaseUid() { return firebaseUid; }
    public String getUsername() { return username; }
    public Instant getCreatedAt() { return createdAt; }
    public Platform getCreatedPlatform() { return createdPlatform; }
    public Platform getLastLoginPlatform() { return lastLoginPlatform; }
    public Instant getLastLoginAt() { return lastLoginAt; }
    public PlayerStats getStats() { return stats; }
}
