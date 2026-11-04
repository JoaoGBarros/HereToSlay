package org.br.heretoslay.accounts.match;

import org.br.heretoslay.accounts.common.PageResponse;
import org.br.heretoslay.accounts.common.exception.NotFoundException;
import org.br.heretoslay.accounts.match.dto.MatchDetailResponse;
import org.br.heretoslay.accounts.match.dto.MatchSummaryResponse;
import org.br.heretoslay.accounts.match.event.MatchResultEvent;
import org.br.heretoslay.accounts.match.event.MatchResultEvent.ParticipantResult;
import org.br.heretoslay.accounts.player.MatchOutcome;
import org.br.heretoslay.accounts.player.Player;
import org.br.heretoslay.accounts.player.PlayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class MatchService {

    private static final Logger log = LoggerFactory.getLogger(MatchService.class);

    private final MatchRepository matchRepository;
    private final MatchParticipantRepository participantRepository;
    private final PlayerRepository playerRepository;

    public MatchService(MatchRepository matchRepository, MatchParticipantRepository participantRepository,
                        PlayerRepository playerRepository) {
        this.matchRepository = matchRepository;
        this.participantRepository = participantRepository;
        this.playerRepository = playerRepository;
    }

    /**
     * Stores a finished match and adds it to each player's stats, all in one transaction. The
     * engine may deliver the same result twice (Kafka is at-least-once), so a match already
     * stored is skipped and never counted again.
     */
    @Transactional
    public void recordResult(MatchResultEvent event) {
        if (matchRepository.existsById(event.matchId())) {
            log.info("Match {} was already recorded, skipping", event.matchId());
            return;
        }
        Map<String, Player> accounts = playerRepository
                .findByFirebaseUidIn(event.players().stream().map(ParticipantResult::playerId).toList())
                .stream()
                .collect(Collectors.toMap(Player::getFirebaseUid, Function.identity()));

        String winnerUsername = event.players().stream()
                .filter(p -> p.playerId().equals(event.winnerId()))
                .findFirst()
                .map(p -> accounts.containsKey(p.playerId()) ? accounts.get(p.playerId()).getUsername() : p.username())
                .orElseThrow();
        MatchRecord match = MatchRecord.from(event, winnerUsername);

        for (ParticipantResult result : event.players()) {
            Player account = accounts.get(result.playerId());
            match.addParticipant(MatchParticipant.of(match, account, result));
            if (account != null) {
                boolean won = result.playerId().equals(event.winnerId());
                account.recordMatch(new MatchOutcome(won, event.winCondition(), result.monstersSlain()));
            } else {
                log.warn("Match {} has a player without a profile; stored without stats", event.matchId());
            }
        }
        matchRepository.save(match);
        log.info("Recorded match {} ({} players, {})", match.getId(), match.getPlayerCount(), match.getWinCondition());
    }

    public PageResponse<MatchSummaryResponse> historyOf(Player player, int page, int size) {
        return PageResponse.from(
                participantRepository.findByPlayerOrderByMatchFinishedAtDesc(player, PageRequest.of(page, size)),
                MatchSummaryResponse::from);
    }

    public MatchDetailResponse getMatch(UUID id) {
        return matchRepository.findWithParticipantsById(id)
                .map(MatchDetailResponse::from)
                .orElseThrow(() -> new NotFoundException("Match not found"));
    }
}
