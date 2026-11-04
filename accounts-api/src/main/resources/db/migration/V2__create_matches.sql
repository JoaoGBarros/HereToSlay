CREATE TABLE matches
(
    id               UUID PRIMARY KEY,
    engine_match_id  BIGINT      NOT NULL,
    started_at       TIMESTAMPTZ NOT NULL,
    finished_at      TIMESTAMPTZ NOT NULL,
    duration_seconds BIGINT      NOT NULL,
    win_condition    VARCHAR(16) NOT NULL,
    winner_username  VARCHAR(20) NOT NULL,
    player_count     INTEGER     NOT NULL,
    CONSTRAINT matches_win_condition CHECK (win_condition IN ('CLASSES', 'MONSTERS', 'LAST_STANDING')),
    CONSTRAINT matches_duration CHECK (duration_seconds >= 0 AND finished_at >= started_at),
    CONSTRAINT matches_player_count CHECK (player_count BETWEEN 2 AND 6)
);

CREATE TABLE match_participants
(
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id         UUID        NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
    player_id        UUID        REFERENCES players (id) ON DELETE SET NULL,
    username         VARCHAR(20) NOT NULL,
    position         INTEGER     NOT NULL,
    party_leader     VARCHAR(32),
    heroes_in_party  INTEGER     NOT NULL,
    classes_in_party INTEGER     NOT NULL,
    monsters_slain   INTEGER     NOT NULL,
    left_reason      VARCHAR(32),
    left_at          TIMESTAMPTZ,
    CONSTRAINT match_participants_position UNIQUE (match_id, position),
    CONSTRAINT match_participants_player UNIQUE (match_id, player_id)
);

-- A player's history, newest first.
CREATE INDEX match_participants_player_idx ON match_participants (player_id);
CREATE INDEX matches_finished_at_idx ON matches (finished_at DESC);
