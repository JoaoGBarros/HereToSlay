package org.br.heretoslay.accounts.player;

import org.br.heretoslay.accounts.common.exception.ConflictException;
import org.br.heretoslay.accounts.common.exception.NotFoundException;
import org.br.heretoslay.accounts.firebase.FirebaseClaimsClient;
import org.br.heretoslay.accounts.player.dto.CreatePlayerRequest;
import org.br.heretoslay.accounts.player.dto.PlayerResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

@Service
@Transactional(readOnly = true)
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final FirebaseClaimsClient firebaseClaimsClient;
    private final Clock clock;

    public PlayerService(PlayerRepository playerRepository, FirebaseClaimsClient firebaseClaimsClient, Clock clock) {
        this.playerRepository = playerRepository;
        this.firebaseClaimsClient = firebaseClaimsClient;
        this.clock = clock;
    }

    /**
     * Creates the profile for a Firebase account and stamps the username on that account. If Firebase
     * refuses the claim, the profile is rolled back so the two never disagree.
     */
    @Transactional
    public PlayerResponse register(String firebaseUid, CreatePlayerRequest request) {
        if (playerRepository.existsByFirebaseUid(firebaseUid)) {
            throw new ConflictException("This account already has a player profile");
        }
        if (playerRepository.existsByUsernameIgnoreCase(request.username())) {
            throw new ConflictException("Username is already taken");
        }
        Player player = Player.register(firebaseUid, request.username(), request.platform(), Instant.now(clock));
        try {
            playerRepository.saveAndFlush(player);
        } catch (DataIntegrityViolationException ex) {
            // Someone took the same name (or the same account signed up twice) a moment earlier.
            throw new ConflictException("Username is already taken");
        }
        firebaseClaimsClient.setUsernameClaim(firebaseUid, player.getUsername());
        return PlayerResponse.from(player);
    }

    public PlayerResponse getOwnProfile(String firebaseUid) {
        return PlayerResponse.from(findByFirebaseUid(firebaseUid));
    }

    /**
     * Records where the player signed in from. Also repairs the username claim when the token does
     * not carry it (for example an account whose claim was cleared in the Firebase console).
     */
    @Transactional
    public PlayerResponse recordLogin(String firebaseUid, String usernameClaim, Platform platform) {
        Player player = findByFirebaseUid(firebaseUid);
        player.recordLogin(platform, Instant.now(clock));
        if (!player.getUsername().equals(usernameClaim)) {
            firebaseClaimsClient.setUsernameClaim(firebaseUid, player.getUsername());
        }
        return PlayerResponse.from(player);
    }

    public PlayerResponse getByUsername(String username) {
        return playerRepository.findByUsernameIgnoreCase(username)
                .map(PlayerResponse::from)
                .orElseThrow(() -> new NotFoundException("Player not found"));
    }

    public Player getEntityByUsername(String username) {
        return playerRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new NotFoundException("Player not found"));
    }

    public boolean isUsernameAvailable(String username) {
        return !playerRepository.existsByUsernameIgnoreCase(username);
    }

    private Player findByFirebaseUid(String firebaseUid) {
        return playerRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new NotFoundException("No player profile for this account yet"));
    }
}
