import { useState } from 'react';
import { getMonsterArt } from '@/utils/CardArt';
import { chanceAtLeast, chanceAtMost } from '@/utils/ClassInfo';
import { monsterRequirement, useI18n } from '@/i18n';
import type { ModifierWindowData, PlayersMap, RollData } from '../../common/types';
import { RollRangeBar } from '../../common/Widgets';
import { bonusSum, ModifierStatus, rawOf, RollChips, RollNumbers } from './RollParts';
import '../fx/fx.css';

export type MonsterOutcome = 'monster_slain' | 'monster_fight_back' | 'monster_survives';

interface MonsterSceneProps {
    roll: RollData;
    modifierWindow?: ModifierWindowData;
    players: PlayersMap;
    me: string;
    onRoll: () => void;
}

const OUTCOME_KIND: Record<string, MonsterOutcome> = { slain: 'monster_slain', fight_back: 'monster_fight_back', survives: 'monster_survives' };

const OUTCOME_TONE: Record<MonsterOutcome, string> = { monster_slain: 'win', monster_fight_back: 'fail', monster_survives: 'mid' };

const OUTCOME_FX: Record<MonsterOutcome, string> = { monster_slain: 'slain', monster_fight_back: 'fight', monster_survives: 'survive' };
const SLASHES = [
    { left: '12%', top: '30%', angle: 24 },
    { left: '10%', top: '44%', angle: 24 },
    { left: '8%', top: '58%', angle: 24 },
];

/** Monster attack: shows the three roll ranges, the roll, and every modifier before it resolves. */
function MonsterScene({ roll, modifierWindow, players, me, onRoll }: MonsterSceneProps) {
    const { t } = useI18n();
    const [clicked, setClicked] = useState(false);
    const monster = roll.monster!;
    const attackerId = roll.rollerId;
    const isAttacker = attackerId === me;
    const attacker = players[attackerId];
    const bonus = bonusSum(roll) + roll.modifiers.reduce((sum, m) => sum + m.value, 0);
    const raw = rawOf(roll);
    const total = roll.total ?? null;
    const outcome = roll.outcome ? { kind: OUTCOME_KIND[roll.outcome], roll: total ?? 0 } : null;
    const zoneOf = (n: number) => (n <= monster.fightBackThreshold ? 'fail' : n >= monster.slayThreshold ? 'win' : 'mid');
    const pWin = chanceAtLeast(monster.slayThreshold, bonus);
    const pFail = chanceAtMost(monster.fightBackThreshold, bonus);
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
                    <span className="hts-label">{t.monster.ranges(bonus)}</span>
                    <RollRangeBar zoneOf={zoneOf} mark={total} height={58} />
                    <div className="monster-scene-legend">
                        <span style={{ color: 'var(--hts-ember-text)' }}>{t.monster.failRange(monster.fightBackThreshold, pFail)}</span>
                        <span style={{ color: '#b9c4c8' }}>{t.monster.midRange(Math.max(0, 100 - pFail - pWin))}</span>
                        <span style={{ color: 'var(--hts-jade-text)' }}>{t.monster.winRange(monster.slayThreshold, pWin)}</span>
                    </div>
                </div>

                <div className="monster-scene-roll hts-panel">
                    {!roll.dice && isAttacker && !clicked ? (
                        <>
                            <p style={{ margin: 0, flex: 1, fontSize: 16, lineHeight: 1.5, color: '#cfc6b3' }}>{t.monster.intro}</p>
                            <button type="button" className="hts-btn" style={{ height: 64, fontSize: 28 }} onClick={() => { setClicked(true); onRoll(); }}>{t.roll.roll}</button>
                        </>
                    ) : (
                        <>
                            <RollNumbers roll={roll} rolling={!roll.dice} size={60} totalSize={80} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <RollChips roll={roll} players={players} />
                                <span className="hts-muted" style={{ fontSize: 14 }}>
                                    {raw == null ? t.monster.rolling(attacker?.username ?? t.common.someone) : outcome ? t.monster.result(raw, total ?? raw) : t.monster.modsOpen(raw)}
                                </span>
                                {modifierWindow && <ModifierStatus window={modifierWindow} players={players} me={me} />}
                            </div>
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
