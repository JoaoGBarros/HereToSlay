import { useI18n } from '@/i18n';
import type { PlayersMap } from '../../common/types';

export interface AppliedModifier {
    id: number;
    playerId: string;
    targetPlayerId: string;
    value: number;
}

/** Passive bonuses the engine adds to every roll of this player (leader, monsters, effects). */
export function passiveBonus(players: PlayersMap, playerId: string): { sum: number; sources: string[] } {
    const p = players[playerId];
    if (!p) return { sum: 0, sources: [] };
    return {
        sum: (p.rollBonusUntilEndOfTurn || 0) + (p.permanentRollBonus || 0),
        sources: [...(p.rollBonusSources || []), ...(p.permanentRollBonusSources || [])],
    };
}

export function modifierSum(mods: AppliedModifier[], playerId: string): number {
    return mods.filter((m) => m.targetPlayerId === playerId).reduce((total, m) => total + m.value, 0);
}

function signed(value: number) {
    return value > 0 ? `+${value}` : `−${Math.abs(value)}`;
}

export function ModifierChips({ mods, players, targetId, align = 'flex-start' }: { mods: AppliedModifier[]; players: PlayersMap; targetId: string; align?: 'flex-start' | 'flex-end' }) {
    const { t } = useI18n();
    const mine = mods.filter((m) => m.targetPlayerId === targetId);
    if (mine.length === 0) return null;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 6 }}>
            {mine.map((m) => (
                <span key={m.id} className={`hts-chip hts-pop ${m.value > 0 ? 'hts-chip--jade' : 'hts-chip--ember'}`}>
                    {t.modifier.fromPlayer(signed(m.value), players[m.playerId]?.username ?? t.common.someone)}
                </span>
            ))}
        </div>
    );
}

export function PassiveChips({ sources, align = 'flex-start' }: { sources: string[]; align?: 'flex-start' | 'flex-end' }) {
    if (sources.length === 0) return null;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 6 }}>
            {sources.map((label, i) => (
                <span key={`${label}-${i}`} className="hts-chip hts-chip--sky">{label}</span>
            ))}
        </div>
    );
}

export { signed };
