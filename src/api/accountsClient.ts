import type { Platform } from '@/auth/platform';

/** Client for the accounts API (player profiles, stats, match history). */

const BASE_URL = (import.meta.env.VITE_ACCOUNTS_API_URL || '/api/v1').replace(/\/$/, '');

export interface PlayerStats {
    matchesPlayed: number;
    wins: number;
    losses: number;
    winsByClasses: number;
    winsByMonsters: number;
    monstersSlainTotal: number;
}

export interface PlayerProfile {
    id: string;
    username: string;
    createdAt: string;
    createdPlatform: Platform;
    lastLoginPlatform: Platform;
    lastLoginAt: string;
    stats: PlayerStats;
}

interface ApiEnvelope<T> {
    success: boolean;
    data: T | null;
    error: string | null;
}

export class AccountsApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'AccountsApiError';
        this.status = status;
    }
}

type TokenSource = () => Promise<string>;

async function request<T>(getToken: TokenSource, path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken();
    let response: Response;
    try {
        response = await fetch(`${BASE_URL}${path}`, {
            ...init,
            headers: {
                ...(init.body ? { 'Content-Type': 'application/json' } : {}),
                Authorization: `Bearer ${token}`,
            },
        });
    } catch {
        throw new AccountsApiError(0, 'network');
    }
    let body: ApiEnvelope<T> | null = null;
    try {
        body = (await response.json()) as ApiEnvelope<T>;
    } catch {
        // Not JSON (a proxy error page, for example); handled below.
    }
    if (!response.ok || !body?.success || body.data == null) {
        throw new AccountsApiError(response.status, body?.error || `HTTP ${response.status}`);
    }
    return body.data;
}

export function getMyProfile(getToken: TokenSource): Promise<PlayerProfile> {
    return request(getToken, '/players/me');
}

export function createProfile(getToken: TokenSource, username: string, platform: Platform): Promise<PlayerProfile> {
    return request(getToken, '/players', { method: 'POST', body: JSON.stringify({ username, platform }) });
}

export type WinCondition = 'CLASSES' | 'MONSTERS' | 'LAST_STANDING';

/** One line of a player's history: the match, and how that player did in it. */
export interface MatchSummary {
    matchId: string;
    startedAt: string;
    finishedAt: string;
    durationSeconds: number;
    winCondition: WinCondition;
    winnerUsername: string;
    playerCount: number;
    position: number;
    won: boolean;
    partyLeader: string | null;
    monstersSlain: number;
    classesInParty: number;
}

export interface Page<T> {
    items: T[];
    page: number;
    size: number;
    total: number;
    totalPages: number;
}

export function getMatchHistory(getToken: TokenSource, username: string, page: number, size: number): Promise<Page<MatchSummary>> {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    return request(getToken, `/players/${encodeURIComponent(username)}/matches?${query}`);
}

export function recordLogin(getToken: TokenSource, platform: Platform): Promise<PlayerProfile> {
    return request(getToken, '/players/me/logins', { method: 'POST', body: JSON.stringify({ platform }) });
}
