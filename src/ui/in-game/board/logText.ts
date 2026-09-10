import type { Dict } from '@/i18n/pt';
import type { LogEntry, PlayersMap } from '../../common/types';

function signed(value: number): string {
    return value > 0 ? `+${value}` : `−${Math.abs(value)}`;
}

/** Turns one engine log entry into a sentence in the current language. */
export function renderLog(t: Dict, e: LogEntry, players: PlayersMap): string {
    const name = (id?: string | number) => (id == null ? '' : players[String(id)]?.username ?? String(id));
    const render = t.engine.log[e.key];
    if (!render) return e.key;
    const value = e.value ?? 0;
    return render({
        actor: name(e.actor) || t.common.someone,
        target: typeof e.target === 'number' ? String(e.target) : name(e.target),
        card: e.cardName ?? '',
        hero: e.heroName ?? '',
        leader: e.leader ? t.classes[e.leader as keyof Dict['classes']]?.label ?? e.leader : '',
        value,
        value2: e.value2 ?? 0,
        count: e.count ?? 0,
        round: e.round ?? 0,
        signed: signed(value),
        success: !!e.success,
        blocked: !!e.blocked,
        outcome: e.outcome ?? '',
    });
}
