/** Shapes of the match_state payload sent by the engine (see backend Match.getMatchState). */

export interface CardData {
    cardId: number;
    cardName?: string;
    type?: string;
    heroClass?: string;
    diceValue?: number;
    possibleValues?: number[];
}

export interface PlayerData {
    username: string;
    leader: string;
    party: CardData[];
    hand: CardData[];
    currentAP: number;
    maxAP: number;
    orderRoll: number | null;
    lastRoll: number | null;
    pendingHeroCard: CardData | null;
    usedCardIds: number[];
    rollBonusUntilEndOfTurn: number;
    rollBonusSources: string[];
    permanentRollBonus: number;
    permanentRollBonusSources: string[];
}

export type PlayersMap = Record<string, PlayerData>;

export interface MonsterData {
    id: number;
    name: string;
    partyRequirement: string;
    fightBackThreshold: number;
    slayThreshold: number;
}

export type Socket = WebSocket | null;

/** Sends a JSON message, waiting for the connection to open if it is still connecting. */
export function sendMessage(socket: Socket, message: Record<string, unknown>): void {
    if (!socket) return;
    const payload = JSON.stringify(message);
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
    } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.addEventListener('open', () => socket.send(payload), { once: true });
    }
}

/** Engine messages are untyped JSON; each handler reads only the fields it knows for its subtype. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EngineMessage = Record<string, any>;

/** Parses a socket message, returning null for anything that is not JSON. */
export function parseMessage(event: MessageEvent): EngineMessage | null {
    try {
        return JSON.parse(event.data);
    } catch {
        return null;
    }
}

export const SELECTING_STATES = ['SELECTING_CARDS', 'SELECTING_HAND_CARDS', 'SELECTING_PLAYER'];
