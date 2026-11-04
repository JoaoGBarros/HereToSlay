CREATE TABLE players
(
    id                   UUID PRIMARY KEY,
    firebase_uid         VARCHAR(128) NOT NULL UNIQUE,
    username             VARCHAR(20)  NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL,
    created_platform     VARCHAR(16)  NOT NULL,
    last_login_platform  VARCHAR(16)  NOT NULL,
    last_login_at        TIMESTAMPTZ  NOT NULL,
    matches_played       INTEGER      NOT NULL DEFAULT 0,
    wins                 INTEGER      NOT NULL DEFAULT 0,
    losses               INTEGER      NOT NULL DEFAULT 0,
    wins_by_classes      INTEGER      NOT NULL DEFAULT 0,
    wins_by_monsters     INTEGER      NOT NULL DEFAULT 0,
    monsters_slain_total INTEGER      NOT NULL DEFAULT 0,
    version              BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT players_username_format CHECK (username ~ '^[A-Za-z0-9_]{3,20}$'),
    CONSTRAINT players_platforms CHECK (created_platform IN ('WEB', 'WINDOWS', 'MACOS', 'LINUX')
        AND last_login_platform IN ('WEB', 'WINDOWS', 'MACOS', 'LINUX')),
    CONSTRAINT players_stats_not_negative CHECK (matches_played >= 0 AND wins >= 0 AND losses >= 0
        AND wins_by_classes >= 0 AND wins_by_monsters >= 0 AND monsters_slain_total >= 0)
);

-- "Joao" and "joao" are the same name.
CREATE UNIQUE INDEX players_username_lower_idx ON players (lower(username));
