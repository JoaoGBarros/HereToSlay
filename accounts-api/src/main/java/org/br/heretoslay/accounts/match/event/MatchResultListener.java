package org.br.heretoslay.accounts.match.event;

import org.br.heretoslay.accounts.match.MatchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Reads the results the game engine publishes when a match ends. A malformed message is logged
 * and skipped so it cannot block the topic; a database failure is retried by Spring Kafka.
 */
@Component
public class MatchResultListener {

    private static final Logger log = LoggerFactory.getLogger(MatchResultListener.class);

    private final MatchService matchService;
    private final JsonMapper jsonMapper;

    public MatchResultListener(MatchService matchService, JsonMapper jsonMapper) {
        this.matchService = matchService;
        this.jsonMapper = jsonMapper;
    }

    @KafkaListener(topics = "${app.kafka.match-results-topic}")
    public void onMatchResult(String message) {
        MatchResultEvent event;
        try {
            event = jsonMapper.readValue(message, MatchResultEvent.class);
        } catch (JacksonException ex) {
            log.error("Skipping a match result that is not valid JSON: {}", ex.getOriginalMessage());
            return;
        }
        if (!event.isValid()) {
            log.error("Skipping an incomplete match result for match {}", event.matchId());
            return;
        }
        matchService.recordResult(event);
    }
}
