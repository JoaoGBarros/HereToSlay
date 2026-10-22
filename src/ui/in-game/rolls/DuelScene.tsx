import { useState } from 'react';
import { classInfo } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import tableBackground from '../../assets/ingame.png';
import challengeArt from '../../assets/cards/challenge.png';
import { GameCard } from '../../common/GameCard';
import { DicePair } from '../../common/PipDie';
import { Stage } from '../../common/Stage';
import type { CardData, DuelData, PlayersMap, RollData } from '../../common/types';
import ModifierPicker, { type ModifierPreview } from '../components/ModifierPicker';
import { rawOf, signed, useRollSound } from './RollParts';
import './stage.css';
import './duel.css';

interface DuelSceneProps {
    duel: DuelData;
    players: PlayersMap;
    me: string;
    hand: CardData[];
    onRoll: () => void;
    onPlayModifier: (cardId: number, value: number, targetId: string, guardianBonus: number) => void;
    onPass: () => void;
    onUnpass: () => void;
}

type Side = 'left' | 'right';

/** One side of the duel: who rolls, the dice, every bonus/Modifier as a chip, and the total. */
function DuelSide({ side, roll, players, me, role, preview, onRoll }: {
    side: Side;
    roll: RollData;
    players: PlayersMap;
    me: string;
    role: string;
    preview: number | null;
    onRoll: () => void;
}) {
    const { t } = useI18n();
    const [clicked, setClicked] = useState(false);
    const playRollSound = useRollSound(roll.dice);
    const player = players[roll.rollerId];
    const info = classInfo(player?.leader);
    const isMine = roll.rollerId === me;
    const raw = rawOf(roll);
    const total = roll.total != null ? roll.total + (preview ?? 0) : null;
    const extras = [...roll.bonuses.map((b) => b.value), ...roll.modifiers.map((m) => m.value), ...(preview ? [preview] : [])];
    const reverse = side === 'right';

    return (
        <div className="duel3-col" style={{ alignItems: reverse ? 'flex-end' : 'flex-start' }}>
            <div className="duel3-who" style={{ flexDirection: reverse ? 'row-reverse' : 'row' }}>
                {info && <img src={info.leaderArt} alt="" style={{ boxShadow: `0 0 0 2px ${info.tint}` }} />}
                <div style={{ lineHeight: 1.1, textAlign: reverse ? 'right' : 'left' }}>
                    <div className="duel3-name">{player?.username}{isMine ? t.common.youSuffix : ''}</div>
                    <div className="duel3-role">{role}</div>
                </div>
            </div>
            <div className="duel3-dice">
                {!roll.dice && isMine && !clicked ? (
                    <button type="button" className="duel3-roll" onClick={() => { setClicked(true); playRollSound(); onRoll(); }}>{t.engine.roll.rollNow}</button>
                ) : (
                    <DicePair dice={roll.dice ?? null} rolling={!roll.dice} size={72} />
                )}
            </div>
            <div className="duel3-mods" style={{ alignItems: reverse ? 'flex-end' : 'flex-start' }}>
                {roll.bonuses.map((b, i) => <span key={`b${i}`} className="duel3-chip duel3-chip--plus">{t.engine.duel.bonusChip(signed(b.value), b.label)}</span>)}
                {roll.modifiers.map((m, i) => (
                    <span key={`m${i}`} className={`duel3-chip hts-pop ${m.value > 0 ? 'duel3-chip--plus' : 'duel3-chip--minus'}`}>
                        {t.engine.duel.modChip(signed(m.value), m.playerId === me ? t.common.you : players[m.playerId]?.username ?? '')}
                    </span>
                ))}
                {preview ? <span className="duel3-chip duel3-chip--preview">{t.engine.duel.previewChip(signed(preview))}</span> : null}
            </div>
            {total != null && raw != null && (
                <div className="duel3-total" style={{ flexDirection: reverse ? 'row-reverse' : 'row' }}>
                    <span key={total} className={`duel3-number duel3-number--${side} hts-pop`}>{total}</span>
                    <span className="duel3-break">{t.engine.duel.breakdown(raw, extras.map(signed).join(' '))}</span>
                </div>
            )}
        </div>
    );
}

/** The challenge, laid out like the design: card and roll on each side, VS in the middle, Modifier window below. */
/** Lands on the winning card when the duel resolves. */
function Crown() {
    return (
        <svg className="duel-crown" viewBox="0 0 96 72" aria-hidden="true">
            <path d="M8 62 4 18l24 20L48 6l20 32 24-20-4 44z" fill="#e9b949" stroke="#7a5410" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="48" cy="44" r="6" fill="#e8693f" />
        </svg>
    );
}

function DuelScene({ duel, players, me, hand, onRoll, onPlayModifier, onPass, onUnpass }: DuelSceneProps) {
    const { t } = useI18n();
    const [preview, setPreview] = useState<ModifierPreview | null>(null);
    const owner = players[duel.ownerId];
    const challenger = players[duel.challengerId];
    const ownerTint = classInfo(owner?.leader)?.tint ?? '#6fb4e8';
    const winnerId = duel.winnerId ?? null;
    const ownerResult = winnerId ? (winnerId === duel.ownerId ? 'win' : 'lose') : null;
    const challengerResult = winnerId ? (winnerId === duel.challengerId ? 'win' : 'lose') : null;
    // The slam and the "Challenge!" stamp play once, when the duel opens.
    const [intro] = useState(() => !winnerId);
    // A Modifier preview only counts while the window is still open.
    const live = duel.modifierWindow ? preview : null;
    const ownerPreview = live?.targetId === duel.ownerId ? live.value : null;
    const challengerPreview = live?.targetId === duel.challengerId ? live.value : null;
    const ownerTotal = duel.ownerRoll.total != null ? duel.ownerRoll.total + (ownerPreview ?? 0) : null;
    const challengerTotal = duel.challengerRoll.total != null ? duel.challengerRoll.total + (challengerPreview ?? 0) : null;
    const challengerName = challenger?.username ?? '';
    const ownerName = owner?.username ?? '';

    let verdict = t.duel.verdictDefault;
    let verdictTone = 'neutral';
    if (winnerId) {
        verdict = winnerId === duel.ownerId ? t.duel.verdictHero(ownerName) : t.duel.verdictChallenger(challengerName);
        verdictTone = winnerId === duel.ownerId ? 'blue' : 'ember';
    } else if (ownerTotal != null && challengerTotal != null) {
        const ownerWins = ownerTotal > challengerTotal;
        verdict = ownerWins ? t.engine.duel.previewWin(ownerTotal, challengerTotal) : t.engine.duel.previewLose(challengerName, ownerTotal, challengerTotal);
        verdictTone = ownerWins ? 'blue' : 'ember';
    }

    return (
        <Stage label={t.duel.aria(challengerName, ownerName)} className={`duel3 ${intro ? 'duel3--intro' : ''} ${winnerId ? 'duel3--resolved' : ''}`}>
            <div className="duel3-half duel3-half--left" aria-hidden="true" />
            <div className="duel3-half duel3-half--right" aria-hidden="true" />
            <img src={tableBackground} alt="" aria-hidden="true" className="duel3-bg" />

            <div className="duel3-banner-wrap">
                <div className="duel3-banner">
                    <img src={challengeArt} alt="" />
                    {t.engine.duel.banner(duel.challengerId === me ? t.common.you : challengerName, duel.ownerId === me ? '' : ownerName, duel.card.cardName ?? '')}
                </div>
            </div>

            <section className="duel3-side duel3-side--left" aria-label={t.duel.rollAria(ownerName)}>
                <div className="duel3-card-slot">
                    {ownerResult === 'win' && <Crown />}
                    <div className={`duel3-card ${ownerResult ? `duel3-card--${ownerResult}` : ''}`} style={{ boxShadow: `0 0 0 3px ${ownerTint}, 0 24px 50px rgba(0,0,0,.6)` }}>
                        <GameCard card={duel.card} width={220} />
                    </div>
                    {ownerResult === 'lose' && <span className="duel-discard-stamp">{t.duel.discarded}</span>}
                </div>
                <DuelSide side="left" roll={duel.ownerRoll} players={players} me={me} role={t.duel.playedTheCard} preview={ownerPreview} onRoll={onRoll} />
            </section>

            <section className="duel3-side duel3-side--right" aria-label={t.duel.rollAria(challengerName)}>
                <div className="duel3-card-slot">
                    {challengerResult === 'win' && <Crown />}
                    <img src={challengeArt} alt="Challenge" className={`duel3-card duel3-card--challenge ${challengerResult ? `duel3-card--${challengerResult}` : ''}`} />
                    {challengerResult === 'lose' && <span className="duel-discard-stamp">{t.duel.discarded}</span>}
                </div>
                <DuelSide side="right" roll={duel.challengerRoll} players={players} me={me} role={t.duel.challenger} preview={challengerPreview} onRoll={onRoll} />
            </section>

            <div className="duel3-vs" aria-hidden="true">VS</div>
            {intro && <div className="duel2-stamp hts-display" aria-hidden="true">{t.duel.stamp}</div>}
            <div className="duel3-verdict-wrap" role="status">
                <span className={`duel3-verdict duel3-verdict--${verdictTone}`}>{verdict}</span>
            </div>

            <ModifierPicker
                window={duel.modifierWindow}
                rolls={[duel.ownerRoll, duel.challengerRoll]}
                hand={hand}
                players={players}
                me={me}
                placement="embedded"
                onPlay={onPlayModifier}
                onPass={onPass}
                onUnpass={onUnpass}
                onPreview={setPreview}
            />
        </Stage>
    );
}

export default DuelScene;
