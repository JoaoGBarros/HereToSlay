import type { Dict } from '@/i18n/pt';
import type { PlayersMap } from '../../common/types';
import type { Announcement, PresenceNotice } from '../useMatchSession';

/** One sentence for what someone picked: names when the pick is public, only a count when it is secret. */
export function renderAnnouncement(t: Dict, a: Announcement, players: PlayersMap): string {
    const name = (id?: string) => (id ? players[id]?.username ?? '' : '');
    const who = name(a.chooserId) || t.common.someone;
    if (a.picked.length === 0) {
        const from = a.target ? name(a.target) : '';
        return t.engine.announce.secret(who, a.count, from, a.card);
    }
    const what = a.picked
        .map((p) => {
            if (p.playerId) return name(p.playerId);
            const card = p.cardName ?? '';
            return p.ownerId && p.ownerId !== a.chooserId ? t.engine.announce.of(card, name(p.ownerId)) : card;
        })
        .join(t.engine.announce.and);
    return t.engine.announce.picked(who, what, a.card);
}

/** One chat line for a player dropping, coming back or leaving the match. */
export function renderNotice(t: Dict, n: PresenceNotice, players: PlayersMap): string {
    const who = players[n.playerId]?.username || t.common.someone;
    if (n.kind === 'disconnected') return t.engine.presence.disconnected(who, Math.round((n.graceMs ?? 60000) / 1000));
    if (n.kind === 'reconnected') return t.engine.presence.reconnected(who);
    return (t.engine.presence.left[n.reason ?? ''] ?? t.engine.presence.left.surrender)(who);
}
