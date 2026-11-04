package org.br.heretoslay.accounts.match;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MatchRepository extends JpaRepository<MatchRecord, UUID> {

    @EntityGraph(attributePaths = "participants")
    Optional<MatchRecord> findWithParticipantsById(UUID id);
}
