import type { CardData, PlayersMap } from '../../common/types';

export type FxKind = 'draw' | 'play' | 'cast' | 'destroy' | 'steal' | 'transfer' | 'discard' | 'modifier';

export interface FxEvent {
    id: number;
    kind: FxKind;
    /** Player the effect starts from / ends at. */
    from?: string;
    to?: string;
    card?: CardData;
    count?: number;
    value?: number;
}

type Zone = 'hand' | 'party';

interface Location {
    playerId: string;
    zone: Zone;
}

/** Cards resolved by their own scenes (modifier window, challenge duel) are not animated again here. */
const SCENE_TYPES = ['MODIFIER', 'CHALLENGE'];
const MAX_DRAWS_ANIMATED = 3;

function locate(players: PlayersMap): Map<number, Location> {
    const where = new Map<number, Location>();
    Object.entries(players).forEach(([playerId, p]) => {
        (p.hand || []).forEach((c) => where.set(c.cardId, { playerId, zone: 'hand' }));
        (p.party || []).forEach((c) => where.set(c.cardId, { playerId, zone: 'party' }));
    });
    return where;
}

/**
 * Infers what happened between two match states (the engine only sends snapshots)
 * so the table can animate it: draws, plays, spells, destroys, steals, hand swaps and discards.
 */
export function diffMatchStates(prev: PlayersMap, next: PlayersMap): Omit<FxEvent, 'id'>[] {
    if (Object.keys(prev).length === 0) return [];
    const before = locate(prev);
    const after = locate(next);
    const events: Omit<FxEvent, 'id'>[] = [];
    const draws: Record<string, number> = {};

    Object.entries(prev).forEach(([playerId, p]) => {
        const cards = [...(p.hand || []), ...(p.party || [])];
        cards.forEach((card) => {
            const was = before.get(card.cardId);
            const now = after.get(card.cardId);
            if (!was) return;
            if (now && now.playerId === was.playerId && now.zone === was.zone) return;
            if (SCENE_TYPES.includes(card.type || '')) return;

            if (was.zone === 'hand') {
                if (!now) {
                    events.push({ kind: card.type === 'MAGIC' ? 'cast' : 'discard', from: playerId, card });
                } else if (now.zone === 'party') {
                    events.push({ kind: 'play', from: playerId, to: now.playerId, card });
                } else {
                    events.push({ kind: 'transfer', from: playerId, to: now.playerId, card });
                }
                return;
            }

            if (!now) {
                events.push({ kind: 'destroy', from: playerId, card });
            } else if (now.zone === 'party') {
                events.push({ kind: 'steal', from: playerId, to: now.playerId, card });
            } else {
                events.push({ kind: 'transfer', from: playerId, to: now.playerId, card });
            }
        });
    });

    Object.entries(next).forEach(([playerId, p]) => {
        // Opponents' hands are hidden: a Hero that appears from nowhere was played from their hand.
        (p.party || []).forEach((card) => {
            if (!before.has(card.cardId)) events.push({ kind: 'play', from: playerId, to: playerId, card });
        });
        const own = (p.hand || []).filter((card) => !before.has(card.cardId)).length;
        const hidden = (p.hand || []).length === 0 ? Math.max(0, (p.handCount ?? 0) - (prev[playerId]?.handCount ?? 0)) : 0;
        if (own + hidden > 0) draws[playerId] = own + hidden;
    });
    Object.entries(draws).forEach(([playerId, count]) => {
        events.push({ kind: 'draw', to: playerId, count: Math.min(count, MAX_DRAWS_ANIMATED) });
    });

    return events;
}
