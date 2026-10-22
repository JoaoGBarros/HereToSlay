import { useState } from 'react';
import { classInfo } from '@/utils/ClassInfo';
import { cardText } from '@/utils/cardText';
import { useI18n } from '@/i18n';
import tableBackground from '../../assets/ingame.png';
import { GameCard } from '../../common/GameCard';
import { DicePair } from '../../common/PipDie';
import { Stage } from '../../common/Stage';
import type { CardData, ModifierWindowData, PlayersMap, RollData } from '../../common/types';
import ModifierPicker, { type ModifierPreview } from '../components/ModifierPicker';
import { bonusSum, rawOf, signed, useRollSound } from './RollParts';
import './stage.css';

interface HeroRollSceneProps {
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

const RAYS = 16;

/**
 * A Hero effect roll as its own scene, in the same family as the challenge: the Hero big on the left,
 * what happens on success in the middle, the dice and the 2..12 track on the right, Modifiers below.
 */
function HeroRollScene({ roll, modifierWindow, players, me, hand, onRoll, onPlayModifier, onPass, onUnpass }: HeroRollSceneProps) {
    const { t, lang } = useI18n();
    const [clicked, setClicked] = useState(false);
    const [preview, setPreview] = useState<ModifierPreview | null>(null);
    const playRollSound = useRollSound(roll.dice);
    const card = roll.card;
    const target = card?.diceValue ?? 0;
    const roller = players[roll.rollerId];
    const isRoller = roll.rollerId === me;
    const info = classInfo(card?.heroClass);
    const tint = info?.tint ?? '#e9b949';
    const leader = classInfo(roller?.leader);
    const raw = rawOf(roll);
    // A Modifier preview only counts while the window is still open.
    const previewValue = modifierWindow && preview?.targetId === roll.rollerId ? preview.value : 0;
    const total = roll.total != null ? roll.total + previewValue : null;
    const resolved = roll.outcome != null;
    const success = roll.outcome === 'success';
    const willSucceed = total != null && total >= target;
    const effect = card ? cardText(card) : null;
    const extras = [...roll.bonuses.map((b) => b.value), ...roll.modifiers.map((m) => m.value), ...(previewValue ? [previewValue] : [])];
    const passiveBonus = bonusSum(roll);
    const tone = resolved ? (success ? 'win' : 'fail') : total != null ? (willSucceed ? 'win' : 'fail') : 'idle';

    let status = t.engine.heroScene.rollToSee;
    if (resolved) status = success ? t.engine.heroScene.effectHappens : t.engine.heroScene.heroUsed;
    else if (modifierWindow) status = t.engine.roll.waitingMods;
    else if (!roll.dice && !isRoller) status = t.engine.roll.waitingRoll(roller?.username ?? '');

    return (
        <Stage label={t.roll.aria} className={`hero3 hero3--${tone}`}>
            <div className="hero3-glow" aria-hidden="true" style={{ background: `radial-gradient(circle at 22% 38%, ${tint}55, transparent 55%)` }} />
            <img src={tableBackground} alt="" aria-hidden="true" className="duel3-bg" />

            <div className="duel3-banner-wrap">
                <div className="hero3-banner" style={{ borderColor: `${tint}aa` }}>
                    {leader && <img src={leader.leaderArt} alt="" />}
                    {t.engine.heroScene.banner(isRoller ? t.common.you : roller?.username ?? '', card?.cardName ?? '', target)}
                </div>
            </div>

            <div className={`hero3-body ${modifierWindow ? '' : 'hero3-body--solo'}`}>
                <section className="hero3-card-slot" aria-label={card?.cardName}>
                    <div className={`hero3-card ${resolved && !success ? 'hero3-card--fail' : ''} ${resolved && success ? 'hero3-card--win' : ''}`} style={{ boxShadow: `0 0 0 4px ${tint}, 0 0 60px ${tint}66, 0 30px 60px rgba(0,0,0,.6)` }}>
                        {card && <GameCard card={card} width={250} />}
                    </div>
                    {resolved && (
                        <div className={`hero3-stamp hero3-stamp--${success ? 'win' : 'fail'}`} aria-hidden="true">
                            {success && (
                                <span className="hero3-rays">
                                    {Array.from({ length: RAYS }).map((_, i) => <i key={i} style={{ transform: `rotate(${(360 / RAYS) * i}deg)` }} />)}
                                </span>
                            )}
                            <b>{success ? t.roll.successStamp : t.roll.failStamp}</b>
                        </div>
                    )}
                </section>

                <section className="hero3-mid">
                    <div className="duel3-who">
                        {leader && <img src={leader.leaderArt} alt="" style={{ boxShadow: `0 0 0 2px ${leader.tint}` }} />}
                        <div style={{ lineHeight: 1.1 }}>
                            <div className="duel3-name">{roller?.username}{isRoller ? t.common.youSuffix : ''}</div>
                            <div className="duel3-role">{t.engine.heroScene.role}</div>
                        </div>
                    </div>
                    <div className="hero3-effect">
                        <span className="hero3-effect-label">{t.engine.heroScene.ifSuccess(target)}</span>
                        <p>{effect ? effect[lang] : card?.cardName}</p>
                    </div>
                    <div className="duel3-mods">
                        {roll.bonuses.map((b, i) => <span key={`b${i}`} className="duel3-chip duel3-chip--bonus">{t.engine.duel.bonusChip(signed(b.value), b.label)}</span>)}
                        {roll.modifiers.map((m, i) => (
                            <span key={`m${i}`} className={`duel3-chip hts-pop ${m.value > 0 ? 'duel3-chip--plus' : 'duel3-chip--minus'}`}>
                                {t.engine.duel.modChip(signed(m.value), m.playerId === me ? t.common.you : players[m.playerId]?.username ?? '')}
                            </span>
                        ))}
                        {previewValue ? <span className="duel3-chip duel3-chip--preview">{t.engine.duel.previewChip(signed(previewValue))}</span> : null}
                    </div>
                </section>

                <section className="hero3-roll" aria-live="polite">
                    <div className="hero3-dice">
                        {!roll.dice && isRoller && !clicked ? (
                            <button type="button" className="hero3-roll-btn" onClick={() => { setClicked(true); playRollSound(); onRoll(); }}>{t.engine.roll.rollNow}</button>
                        ) : (
                            <DicePair dice={roll.dice ?? null} rolling={!roll.dice} size={88} />
                        )}
                        {total != null && raw != null && (
                            <div className="hero3-total">
                                <span key={total} className={`hero3-number hero3-number--${tone} hts-pop`}>{total}</span>
                                <span className="duel3-break">{t.engine.duel.breakdown(raw, extras.map(signed).join(' '))}</span>
                            </div>
                        )}
                    </div>
                    <div className="hero3-track" role="img" aria-label={t.engine.dock.needs(target)}>
                        {Array.from({ length: 11 }).map((_, i) => {
                            const n = i + 2;
                            const win = n + passiveBonus >= target;
                            const marked = raw === n;
                            return (
                                <span key={n} className={`hero3-cell ${win ? 'hero3-cell--win' : ''} ${marked ? 'hero3-cell--mark' : ''}`}>
                                    {n}
                                    {n + passiveBonus === target && <em className="hero3-goal">{target}+</em>}
                                </span>
                            );
                        })}
                    </div>
                    <span className={`hero3-status hero3-status--${tone}`}>{status}</span>
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

export default HeroRollScene;
