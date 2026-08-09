import { useCallback, useEffect, useState } from 'react';
import { classInfo } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import { playSound } from '@/utils/SoundManager/SoundManager';
import challengeArt from '../../assets/cards/challenge.png';
import { GameCard } from '../../common/GameCard';
import { DicePair, useLocalRoll } from '../../common/PipDie';
import type { CardData, PlayersMap } from '../../common/types';
import { ModifierChips, modifierSum, PassiveChips, passiveBonus, type AppliedModifier } from './RollParts';
import './duel.css';

const INTRO_MS = 1500;
const SPARKS = 14;

interface DuelSceneProps {
    players: PlayersMap;
    me: string;
    heroId: string;
    challengerId: string;
    card: CardData | null;
    rolls: Record<string, number | null>;
    winnerId: string | null;
    mods: AppliedModifier[];
    onRoll: (sum: number) => void;
}

type Side = 'hero' | 'challenger';

function Crown() {
    return (
        <svg className="duel-crown" viewBox="0 0 96 72" aria-hidden="true">
            <path d="M8 62 4 18l24 20L48 6l20 32 24-20-4 44z" fill="#e9b949" stroke="#7a5410" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="48" cy="44" r="6" fill="#e8693f" />
        </svg>
    );
}

function DuelSide({ side, players, me, playerId, rolled, total, mods, result, canRoll, onRoll, card }: {
    side: Side;
    players: PlayersMap;
    me: string;
    playerId: string;
    rolled: number | null;
    total: number | null;
    mods: AppliedModifier[];
    result: 'win' | 'lose' | null;
    canRoll: boolean;
    onRoll: (sum: number) => void;
    card: React.ReactNode;
}) {
    const { t } = useI18n();
    const handleResult = useCallback((sum: number) => onRoll(sum), [onRoll]);
    const { dice, rolling, roll } = useLocalRoll(handleResult);
    const player = players[playerId];
    const info = classInfo(player?.leader);
    const passive = passiveBonus(players, playerId);
    const isMine = playerId === me;
    const align = side === 'hero' ? 'flex-start' : 'flex-end';

    return (
        <section className={`duel-side duel-side--${side} ${result ? `duel-side--${result}` : ''}`} aria-label={t.duel.rollAria(player?.username ?? '')}>
            <div className="duel-card-slot">
                {result === 'win' && <Crown />}
                <div className={`duel-card duel-card--${side}`}>{card}</div>
                {result === 'lose' && <span className="duel-discard-stamp">{t.duel.discarded}</span>}
            </div>
            <div className="duel-col" style={{ alignItems: align }}>
                <div className="duel-who" style={{ flexDirection: side === 'hero' ? 'row' : 'row-reverse' }}>
                    {info && <img src={info.leaderArt} alt="" style={{ boxShadow: `0 0 0 3px ${info.tint}` }} />}
                    <div style={{ lineHeight: 1.1, textAlign: side === 'hero' ? 'left' : 'right' }}>
                        <div className="duel-name">{player?.username}{isMine ? t.common.youSuffix : ''}</div>
                        <div className="duel-role">{side === 'hero' ? t.duel.playedTheCard : t.duel.challenger}</div>
                    </div>
                </div>
                <div className="duel-dice-area">
                    {rolled == null && isMine && canRoll && !rolling && !dice ? (
                        <button type="button" className="hts-btn duel-roll-btn" onClick={roll}>{t.roll.roll}</button>
                    ) : rolled != null && !dice ? null : (
                        <DicePair dice={dice} rolling={rolling || (rolled == null && !isMine)} size={84} />
                    )}
                    {rolled == null && !isMine && <span className="duel-waiting">{t.duel.rolling(player?.username ?? t.common.someone)}</span>}
                    {rolled == null && isMine && !canRoll && <span className="duel-waiting">{t.duel.getReady}</span>}
                </div>
                <PassiveChips sources={passive.sources} align={align} />
                <ModifierChips mods={mods} players={players} targetId={playerId} align={align} />
                {total != null && (
                    <div className="duel-total-row" style={{ flexDirection: side === 'hero' ? 'row' : 'row-reverse' }}>
                        <span key={total} className="hts-display duel-total" data-side={side}>{total}</span>
                        <span className="duel-dice-note">{t.duel.dice(rolled)}</span>
                    </div>
                )}
            </div>
        </section>
    );
}

/** Full-screen challenge: both players roll, highest total wins, ties favor the challenger. */
function DuelScene({ players, me, heroId, challengerId, card, rolls, winnerId, mods, onRoll }: DuelSceneProps) {
    const { t } = useI18n();
    const [intro, setIntro] = useState(true);

    useEffect(() => {
        playSound('challenge');
        const t = setTimeout(() => setIntro(false), INTRO_MS);
        return () => clearTimeout(t);
    }, []);

    const heroRoll = rolls[heroId] ?? null;
    const challengerRoll = rolls[challengerId] ?? null;
    const heroTotal = heroRoll != null ? heroRoll + passiveBonus(players, heroId).sum + modifierSum(mods, heroId) : null;
    const challengerTotal = challengerRoll != null ? challengerRoll + passiveBonus(players, challengerId).sum + modifierSum(mods, challengerId) : null;
    const heroName = players[heroId]?.username ?? t.duel.heroFallback;
    const challengerName = players[challengerId]?.username ?? t.duel.challengerFallback;
    const heroResult = winnerId ? (winnerId === heroId ? 'win' : 'lose') : null;
    const challengerResult = winnerId ? (winnerId === challengerId ? 'win' : 'lose') : null;

    // Tug of war: how far the totals lean to each side (50% = even).
    const lean = heroTotal != null && challengerTotal != null
        ? Math.round((heroTotal / Math.max(1, heroTotal + challengerTotal)) * 100)
        : heroTotal != null ? 62 : challengerTotal != null ? 38 : 50;

    let verdict = t.duel.verdictDefault;
    if (winnerId) verdict = winnerId === heroId ? t.duel.verdictHero(heroName) : t.duel.verdictChallenger(challengerName);
    else if (heroRoll != null && challengerRoll != null) verdict = t.duel.modsOpen;

    return (
        <div
            className={`scene duel2 ${intro ? 'duel2--intro' : ''} ${winnerId ? 'duel2--resolved' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={t.duel.aria(challengerName, heroName)}
        >
            <div className="duel2-bg duel2-bg--hero" aria-hidden="true" />
            <div className="duel2-bg duel2-bg--challenger" aria-hidden="true" />
            <svg className="duel2-seam" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polyline points="57,0 52,22 58,30 47,55 54,62 43,100" />
            </svg>

            <div className="duel2-top">
                <div className="duel2-banner">
                    <img src={challengeArt} alt="" />
                    {t.duel.banner(challengerName, heroName)}
                </div>
                <div className="duel2-tug" role="img" aria-label={t.duel.totalsAria(heroName, String(heroTotal ?? '–'), challengerName, String(challengerTotal ?? '–'))}>
                    <span className="duel2-tug-hero" style={{ width: `${lean}%` }} />
                    <span className="duel2-tug-knot" style={{ left: `${lean}%` }} />
                </div>
            </div>

            <DuelSide
                side="hero"
                players={players}
                me={me}
                playerId={heroId}
                rolled={heroRoll}
                total={heroTotal}
                mods={mods}
                result={heroResult}
                canRoll={!intro}
                onRoll={onRoll}
                card={card ? <GameCard card={card} width={240} /> : <div className="duel-card-placeholder">{t.duel.cardPlaceholder}</div>}
            />
            <DuelSide
                side="challenger"
                players={players}
                me={me}
                playerId={challengerId}
                rolled={challengerRoll}
                total={challengerTotal}
                mods={mods}
                result={challengerResult}
                canRoll={!intro}
                onRoll={onRoll}
                card={<img src={challengeArt} alt="Challenge" className="duel-challenge-img" />}
            />

            <div className="duel2-vs" aria-hidden="true">
                <div className="duel2-rays">
                    {Array.from({ length: SPARKS }).map((_, i) => (
                        <span key={i} style={{ transform: `rotate(${(360 / SPARKS) * i}deg)` }} />
                    ))}
                </div>
                <span className="hts-display">VS</span>
            </div>

            {intro && <div className="duel2-stamp hts-display" aria-hidden="true">{t.duel.stamp}</div>}
            <div className={`duel2-verdict ${winnerId ? 'duel2-verdict--final' : ''}`} role="status">{verdict}</div>
        </div>
    );
}

export default DuelScene;
