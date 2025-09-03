export type LobbyStatus =
    | "CREATED"
    | "WAITING_FOR_PLAYERS"
    | "STARTING"
    | "IN_PROGRESS"
    | "COMPLETED";

export const LobbyStatus = {
    CREATED: "CREATED",
    WAITING_FOR_PLAYERS: "WAITING_FOR_PLAYERS",
    STARTING: "STARTING",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED"
} as const;