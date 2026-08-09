import { useCallback } from 'react';
import { getMonsterArt } from '@/utils/CardArt';
import { chanceAtLeast, chanceAtMost } from '@/utils/ClassInfo';
import { monsterRequirement, useI18n } from '@/i18n';
import { DicePair, useLocalRoll } from '../../common/PipDie';
import type { MonsterData, PlayersMap } from '../../common/types';
import { RollRangeBar } from '../../common/Widgets';
import { ModifierChips, modifierSum, PassiveChips, passiveBonus, type AppliedModifier } from './RollParts';
import '../fx/fx.css';

export type MonsterOutcome = 'monster_slain' | 'monster_fight_back' | 'monster_survives';

interface MonsterSceneProps {
    players: PlayersMap;
    me: string;
    attackerId: string;
    monster: MonsterData;
    raw: number | null;
    outcome: { kind: MonsterOutcome; roll: number } | null;
    mods: AppliedModifier[];
    onRoll: (sum: number) => void;
}

const OUTCOME_TONE: Record<MonsterOutcome, string> = { monster_slain: 'win', monster_fight_back: 'fail', monster_survives: 'mid' };

const OUTCOME_FX: Record<MonsterOutcome, string> = { monster_slain: 'slain', monster_fight_back: 'fight', monster_survives: 'survive' };
const SLASHES = [
    { left: '12%', top: '30%', angle: 24 },
    { left: '10%', top: '44%', angle: 24 },
    { left: '8%', top: '58%', angle: 24 },
];

/** Monster attack: shows the three roll ranges, the roll, and every modifier before it resolves. */
function MonsterScene({ players, me, attackerId, monster, raw, outcome, mods, onRoll }: MonsterSceneProps) {
    const { t } = useI18n();
    const handleResult = useCallback((sum: number) => onRoll(sum), [onRoll]);
    const { dice, rolling, roll } = useLocalRoll(handleResult);
    const isAttacker = attackerId === me;
    const attacker = players[attackerId];
    const passive = passiveBonus(players, attackerId);
    const total = outcome ? outcome.roll : raw != null ? raw + passive.sum + modifierSum(mods, attackerId) : null;
    const zoneOf = (n: number) => (n <= monster.fightBackThreshold ? 'fail' : n >= monster.slayThreshold ? 'win' : 'mid');
    const pWin = chanceAtLeast(monster.slayThreshold, passive.sum);
    const pFail = chanceAtMost(monster.fightBackThreshold, passive.sum);
    const art = getMonsterArt(monster.name);

    const fxClass = outcome ? OUTCOME_FX[outcome.kind] : '';

    return (
        <div className={`scene monster-scene hts-fade ${fxClass ? `monster-scene--${fxClass}` : ''}`} role="dialog" aria-modal="true" aria-label={t.monster.aria(monster.name)}>
            {art && <img src={art} alt="" aria-hidden="true" className="monster-scene-blur" />}
            {art && <img src={art} alt={monster.name} className="monster-scene-card" />}
            {outcome && (
                <div className={`monster-fx monster-fx--${fxClass}`} aria-hidden="true">
                    {outcome.kind === 'monster_slain' && SLASHES.map((s, i) => (
                        <span key={i} className="monster-fx-slash" style={{ left: s.left, top: s.top, transform: `rotate(${s.angle}deg)`, animationDelay: `${i * 0.12}s` }} />
                    ))}
                    <span className="monster-fx-stamp">{t.monster.stamps[outcome.kind]}</span>
                </div>
            )}
            <section className="monster-scene-body">
                <div>
                    <span className="hts-label" style={{ color: 'var(--hts-ember-text)' }}>{isAttacker ? t.monster.youAttack : t.monster.attacks(attacker?.username ?? t.common.someone)}{t.monster.cost}</span>
                    <h1 className="hts-display" style={{ fontSize: 64 }}>{monster.name}</h1>
                </div>
                <div className="monster-scene-req">
                    <span className="hts-label">{t.monster.requirement}</span>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{monsterRequirement(t, monster.partyRequirement)}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span className="hts-label">{t.monster.ranges(passive.sum)}</span>
                    <RollRangeBar zoneOf={zoneOf} mark={total} height={58} />
                    <div className="monster-scene-legend">
                        <span style={{ color: 'var(--hts-ember-text)' }}>{t.monster.failRange(monster.fightBackThreshold, pFail)}</span>
                        <span style={{ color: '#b9c4c8' }}>{t.monster.midRange(Math.max(0, 100 - pFail - pWin))}</span>
                        <span style={{ color: 'var(--hts-jade-text)' }}>{t.monster.winRange(monster.slayThreshold, pWin)}</span>
                    </div>
                </div>

                <div className="monster-scene-roll hts-panel">
                    {raw == null && isAttacker && !rolling && !dice ? (
                        <>
                            <p style={{ margin: 0, flex: 1, fontSize: 16, lineHeight: 1.5, color: '#cfc6b3' }}>
                                {t.monster.intro}
                            </p>
                            <button type="button" className="hts-btn" style={{ height: 64, fontSize: 28 }} onClick={roll}>{t.roll.roll}</button>
                        </>
                    ) : (
                        <>
                            <DicePair dice={dice} rolling={rolling || (raw == null && !isAttacker)} size={60} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <PassiveChips sources={passive.sources} />
                                <ModifierChips mods={mods} players={players} targetId={attackerId} />
                                <span className="hts-muted" style={{ fontSize: 14 }}>
                                    {raw == null ? t.monster.rolling(attacker?.username ?? t.common.someone) : outcome ? t.monster.result(raw, outcome.roll) : t.monster.modsOpen(raw)}
                                </span>
                            </div>
                            {total != null && <span className="hts-display hts-pop" style={{ fontSize: 72 }}>{total}</span>}
                        </>
                    )}
                </div>

                {outcome && (
                    <div className={`monster-scene-outcome monster-scene-outcome--${OUTCOME_TONE[outcome.kind]} hts-pop`} role="status">
                        {monster.name} {t.monster.outcomes[outcome.kind]}
                    </div>
                )}
            </section>
        </div>
    );
}

export default MonsterScene;
