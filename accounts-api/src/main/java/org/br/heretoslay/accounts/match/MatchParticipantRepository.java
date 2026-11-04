package org.br.heretoslay.accounts.match;

import org.br.heretoslay.accounts.player.Player;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchParticipantRepository extends JpaRepository<MatchParticipant, Long> {

    /** A player's matches, newest first, with the match loaded in the same query. */
    @EntityGraph(attributePaths = "match")
    Page<MatchParticipant> findByPlayerOrderByMatchFinishedAtDesc(Player player, Pageable pageable);
}
