package org.br.heretoslay.accounts.player;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlayerRepository extends JpaRepository<Player, UUID> {

    Optional<Player> findByFirebaseUid(String firebaseUid);

    List<Player> findByFirebaseUidIn(Collection<String> firebaseUids);

    boolean existsByFirebaseUid(String firebaseUid);

    /** Usernames are unique regardless of case; the lower(username) index enforces it. */
    @Query("select p from Player p where lower(p.username) = lower(:username)")
    Optional<Player> findByUsernameIgnoreCase(@Param("username") String username);

    @Query("select count(p) > 0 from Player p where lower(p.username) = lower(:username)")
    boolean existsByUsernameIgnoreCase(@Param("username") String username);
}
