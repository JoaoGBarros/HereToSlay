import type { Dict } from '@/i18n/pt';
import type { PlayersMap } from '../../common/types';
import type { PresenceNotice } from '../useMatchSession';

/** One chat line for a player dropping, coming back or leaving the match. */
export function renderNotice(t: Dict, n: PresenceNotice, players: PlayersMap): string {
    const who = players[n.playerId]?.username || t.common.someone;
    if (n.kind === 'disconnected') return t.engine.presence.disconnected(who, Math.round((n.graceMs ?? 60000) / 1000));
    if (n.kind === 'reconnected') return t.engine.presence.reconnected(who);
    return (t.engine.presence.left[n.reason ?? ''] ?? t.engine.presence.left.surrender)(who);
}
