import { useState } from 'react';
import { getMonsterArt } from '@/utils/CardArt';
import { chanceAtLeast, chanceAtMost, classInfo } from '@/utils/ClassInfo';
import { monsterRequirement, useI18n } from '@/i18n';
import tableBackground from '../../assets/ingame.png';
import { DicePair } from '../../common/PipDie';
import { Stage } from '../../common/Stage';
import type { CardData, ModifierWindowData, PlayersMap, RollData } from '../../common/types';
import { RollRangeBar } from '../../common/Widgets';
import ModifierPicker, { type ModifierPreview } from '../components/ModifierPicker';
import { bonusSum, modifierSum, rawOf, signed, useRollSound } from './RollParts';
import './stage.css';

export type MonsterOutcome = 'monster_slain' | 'monster_fight_back' | 'monster_survives';

interface MonsterSceneProps {
    roll: RollData;
    modifierWindow?: ModifierWindowData;
    players: PlayersMap;
    me: string;
    hand: CardData[];
    onRoll: () => void;
    onPlayModifier: (cardId: number, value: number, targetId: string, guardianBonus: number) => void;
    onPass: () => void;
    onUnpass: () => void;
}

const OUTCOME_KIND: Record<string, MonsterOutcome> = { slain: 'monster_slain', fight_back: 'monster_fight_back', survives: 'monster_survives' };
const OUTCOME_TONE: Record<MonsterOutcome, 'win' | 'fail' | 'mid'> = { monster_slain: 'win', monster_fight_back: 'fail', monster_survives: 'mid' };
const SLASHES = [0, 1, 2];

/**
 * Monster attack as its own scene, in the same family as the Hero roll: the Monster big on the left,
 * its requirement and roll ranges in the middle, the dice on the right, Modifiers below with room of their own.
 */
function MonsterScene({ roll, modifierWindow, players, me, hand, onRoll, onPlayModifier, onPass, onUnpass }: MonsterSceneProps) {
    const { t } = useI18n();
    const [clicked, setClicked] = useState(false);
    const [preview, setPreview] = useState<ModifierPreview | null>(null);
    const playRollSound = useRollSound(roll.dice);
    const monster = roll.monster!;
    const attacker = players[roll.rollerId];
    const isAttacker = roll.rollerId === me;
    const leader = classInfo(attacker?.leader);
    const art = getMonsterArt(monster.name);
    const raw = rawOf(roll);
    // A Modifier preview only counts while the window is still open.
    const previewValue = modifierWindow && preview?.targetId === roll.rollerId ? preview.value : 0;
    const total = roll.total != null ? roll.total + previewValue : null;
    // Everything added to the dice so far (bonuses, Modifiers played, the one being previewed).
    const shift = bonusSum(roll) + modifierSum(roll) + previewValue;
    const extras = [...roll.bonuses.map((b) => b.value), ...roll.modifiers.map((m) => m.value), ...(previewValue ? [previewValue] : [])];
    const zoneOf = (n: number) => (n <= monster.fightBackThreshold ? 'fail' : n >= monster.slayThreshold ? 'win' : 'mid');
    const pWin = chanceAtLeast(monster.slayThreshold, shift);
    const pFail = chanceAtMost(monster.fightBackThreshold, shift);
    const outcome = roll.outcome ? OUTCOME_KIND[roll.outcome] : null;
    const tone = outcome ? OUTCOME_TONE[outcome] : total != null ? zoneOf(total) : 'idle';
    const attackerName = attacker?.username ?? t.common.someone;

    let status = t.monster.intro;
    if (outcome) status = `${monster.name} ${t.monster.outcomes[outcome]}`;
    else if (modifierWindow && raw != null) status = t.engine.roll.waitingMods;
    else if (!roll.dice && !isAttacker) status = t.monster.rolling(attackerName);

    return (
        <Stage label={t.monster.aria(monster.name)} className={`mon3 mon3--${tone}`}>
            {art && <img src={art} alt="" aria-hidden="true" className="mon3-blur" />}
            <img src={tableBackground} alt="" aria-hidden="true" className="duel3-bg" />

            <div className="duel3-banner-wrap">
                <div className="hero3-banner mon3-banner">
                    {leader && <img src={leader.leaderArt} alt="" />}
                    {isAttacker ? t.monster.youAttack : t.monster.attacks(attackerName)} {monster.name}{t.monster.cost}
                </div>
            </div>

            <div className={`hero3-body ${modifierWindow ? '' : 'hero3-body--solo'}`}>
                <section className="mon3-card-slot" aria-label={monster.name}>
                    <div className={`mon3-card ${outcome ? `mon3-card--${OUTCOME_TONE[outcome]}` : ''}`}>
                        {art ? <img src={art} alt={monster.name} /> : <span>{monster.name}</span>}
                        {outcome === 'monster_slain' && SLASHES.map((i) => <i key={i} className="mon3-slash" style={{ top: `${30 + i * 16}%`, animationDelay: `${i * 0.12}s` }} />)}
                    </div>
                    {outcome && (
                        <div className={`hero3-stamp hero3-stamp--${OUTCOME_TONE[outcome]}`} aria-hidden="true">
                            <b>{t.monster.stamps[outcome]}</b>
                        </div>
                    )}
                </section>

                <section className="mon3-mid">
                    <h1 className="mon3-name">{monster.name}</h1>
                    <div className="mon3-req">
                        <span className="hero3-effect-label">{t.monster.requirement}</span>
                        <b>{monsterRequirement(t, monster.partyRequirement)}</b>
                    </div>
                    <ul className="mon3-legend">
                        <li className="mon3-legend--fail">{t.monster.failRange(monster.fightBackThreshold, pFail)}</li>
                        <li className="mon3-legend--mid">{t.monster.midRange(Math.max(0, 100 - pFail - pWin))}</li>
                        <li className="mon3-legend--win">{t.monster.winRange(monster.slayThreshold, pWin)}</li>
                    </ul>
                </section>

                <section className="hero3-roll" aria-live="polite">
                    <div className="hero3-dice">
                        {!roll.dice && isAttacker && !clicked ? (
                            <button type="button" className="hero3-roll-btn" onClick={() => { setClicked(true); playRollSound(); onRoll(); }}>{t.engine.roll.rollNow}</button>
                        ) : (
                            <DicePair dice={roll.dice ?? null} rolling={!roll.dice} size={88} />
                        )}
                        {total != null && raw != null && (
                            <div className="hero3-total">
                                <span key={total} className={`hero3-number hero3-number--${tone === 'mid' ? 'idle' : tone} hts-pop`}>{total}</span>
                                <span className="duel3-break">{t.engine.duel.breakdown(raw, extras.map(signed).join(' '))}</span>
                            </div>
                        )}
                    </div>
                    <span className="hts-label">{t.monster.ranges(shift)}</span>
                    <RollRangeBar zoneOf={zoneOf} mark={total} height={48} />
                    <div className="duel3-mods">
                        {roll.modifiers.map((m, i) => (
                            <span key={i} className={`duel3-chip hts-pop ${m.value > 0 ? 'duel3-chip--plus' : 'duel3-chip--minus'}`}>
                                {t.engine.duel.modChip(signed(m.value), m.playerId === me ? t.common.you : players[m.playerId]?.username ?? '')}
                            </span>
                        ))}
                        {previewValue ? <span className="duel3-chip duel3-chip--preview">{t.engine.duel.previewChip(signed(previewValue))}</span> : null}
                    </div>
                    <span className={`hero3-status hero3-status--${tone === 'mid' ? 'idle' : tone}`}>{status}</span>
                </section>
            </div>

            {modifierWindow && (
                <ModifierPicker
                    window={modifierWindow}
                    rolls={[roll]}
                    hand={hand}
                    players={players}
                    me={me}
                    placement="embedded"
                    onPlay={onPlayModifier}
                    onPass={onPass}
                    onUnpass={onUnpass}
                    onPreview={setPreview}
                />
            )}
        </Stage>
    );
}

export default MonsterScene;
