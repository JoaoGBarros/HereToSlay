/** Shapes of the per-player match_state payload sent by the engine (see backend Match.stateFor). */

export interface CardData {
    cardId: number;
    cardName?: string;
    type?: string;
    heroClass?: string;
    baseClass?: string;
    diceValue?: number;
    possibleValues?: number[];
    item?: CardData;
    cursed?: boolean;
    maskClass?: string;
}

export interface MonsterData {
    id: number;
    name: string;
    partyRequirement: string;
    fightBackThreshold: number;
    slayThreshold: number;
    penalty?: string;
    reward?: string;
}

export interface PlayerData {
    username: string;
    leader: string;
    party: CardData[];
    /** Only filled for the viewer's own hand. */
    hand: CardData[];
    handCount: number;
    slain: MonsterData[];
    currentAP: number;
    maxAP: number;
    orderRoll: number | null;
    orderDice?: [number, number];
    usedCardIds: number[];
    leaderSkillUsed: boolean;
    rollBonusUntilEndOfTurn: number;
    rollBonusSources: string[];
    protectedFromSteal: boolean;
    protectedFromDestroy: boolean;
    unchallengeable: boolean;
    /** Why the player is out of the match (no_show, disconnected, surrender), or null while playing. */
    leftReason?: string | null;
}

export type PlayersMap = Record<string, PlayerData>;

export interface RollBonus {
    label: string;
    value: number;
}

export interface RollModifier {
    playerId: string;
    value: number;
    label: string;
}

export interface RollData {
    rollId: string;
    kind: 'HERO' | 'ATTACK' | 'CHALLENGE';
    rollerId: string;
    bonuses: RollBonus[];
    modifiers: RollModifier[];
    card?: CardData;
    monster?: MonsterData;
    dice?: [number, number];
    total?: number;
    outcome?: 'success' | 'fail' | 'slain' | 'fight_back' | 'survives';
}

export interface ModifierWindowData {
    holders: string[];
    passed: string[];
    targets: string[];
    remainingMs: number;
    durationMs: number;
}

/** Option shapes built by the engine's Ctx helpers. */
export interface ChoiceOption {
    id: string;
    ownerId?: string;
    card?: CardData;
    hidden?: boolean;
    index?: number;
    username?: string;
    leader?: string;
    handCount?: number;
    heroCount?: number;
}

export interface ChoicePending {
    type: 'choice';
    choiceId: string;
    chooserId: string;
    prompt: string;
    params: Record<string, string | number>;
    min: number;
    max: number;
    remainingMs: number;
    source?: CardData;
    /** The chooser gets the real options; the others get them too, face down when they are private. */
    options?: ChoiceOption[];
    /** What the chooser has marked so far. */
    preview?: string[];
}

export interface ChallengeWindowPending {
    type: 'challenge_window';
    card: CardData;
    ownerId: string;
    eligible: string[];
    passed: string[];
    remainingMs: number;
    durationMs: number;
}

export interface DuelData {
    type: 'duel';
    card: CardData;
    ownerId: string;
    challengerId: string;
    ownerRoll: RollData;
    challengerRoll: RollData;
    winnerId?: string;
    modifierWindow?: ModifierWindowData;
}

export interface RollPending {
    type: 'roll';
    roll: RollData;
    modifierWindow?: ModifierWindowData;
}

export type Pending = ChoicePending | ChallengeWindowPending | DuelData | RollPending;

export type RecentResult =
    | { seq: number; type: 'roll'; roll: RollData }
    | { seq: number; type: 'duel'; duel: DuelData };

export interface LogEntry {
    key: string;
    id: number;
    ts: number;
    actor?: string;
    target?: string | number;
    cardName?: string;
    cardType?: string;
    heroName?: string;
    leader?: string;
    value?: number;
    value2?: number;
    count?: number;
    round?: number;
    success?: boolean;
    blocked?: boolean;
    outcome?: string;
    reason?: string;
}

export interface MatchView {
    matchState: string;
    round: number;
    startedAt?: number;
    currentPlayerTurn: string;
    turnOrder: string[];
    pickOrder: string[];
    availablePartyLeaders: string[];
    players: PlayersMap;
    monsters: MonsterData[];
    monsterDeckCount: number;
    drawPileCount: number;
    discardPile: CardData[];
    log: LogEntry[];
    idle: boolean;
    /** Players who have opened the match (LOADING phase). */
    loaded?: string[];
    /** Players whose connection dropped and who still have time to come back. */
    disconnected?: string[];
    /** Time left on the current setup timer (loading, initiative, Party Leader). */
    setupRemainingMs?: number;
    pending?: Pending;
    recent?: RecentResult;
    winner?: { playerId: string | null; reason: 'monsters' | 'classes' | 'last_standing' | 'not_enough_players' };
}

export const EMPTY_VIEW: MatchView = {
    matchState: '',
    round: 0,
    currentPlayerTurn: '',
    turnOrder: [],
    pickOrder: [],
    availablePartyLeaders: [],
    players: {},
    monsters: [],
    monsterDeckCount: 0,
    drawPileCount: 0,
    discardPile: [],
    log: [],
    idle: true,
};

export function rollTotal(roll: RollData): number | null {
    return roll.total ?? null;
}

export function rollBonusSum(roll: RollData): number {
    return roll.bonuses.reduce((sum, b) => sum + b.value, 0) + roll.modifiers.reduce((sum, m) => sum + m.value, 0);
}

export type SocketRef = WebSocket | null;

/** Sends a JSON message, waiting for the connection to open if it is still connecting. */
export function sendMessage(socket: SocketRef, message: Record<string, unknown>): void {
    const ws = socket;
    if (!ws) return;
    const payload = JSON.stringify(message);
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
    } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.addEventListener('open', () => ws.send(payload), { once: true });
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
