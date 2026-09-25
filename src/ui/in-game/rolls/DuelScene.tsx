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
import { rawOf, signed } from './RollParts';
import './stage.css';

interface DuelSceneProps {
    duel: DuelData;
    players: PlayersMap;
    me: string;
    hand: CardData[];
    onRoll: () => void;
    onPlayModifier: (cardId: number, value: number, targetId: string, guardianBonus: number) => void;
    onPass: () => void;
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
                    <button type="button" className="duel3-roll" onClick={() => { setClicked(true); onRoll(); }}>{t.engine.roll.rollNow}</button>
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
function DuelScene({ duel, players, me, hand, onRoll, onPlayModifier, onPass }: DuelSceneProps) {
    const { t } = useI18n();
    const [preview, setPreview] = useState<ModifierPreview | null>(null);
    const owner = players[duel.ownerId];
    const challenger = players[duel.challengerId];
    const ownerTint = classInfo(owner?.leader)?.tint ?? '#6fb4e8';
    const winnerId = duel.winnerId ?? null;
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
        <Stage label={t.duel.aria(challengerName, ownerName)} className="duel3">
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
                <div className={`duel3-card ${winnerId && winnerId !== duel.ownerId ? 'duel3-card--lost' : ''}`} style={{ boxShadow: `0 0 0 3px ${ownerTint}, 0 24px 50px rgba(0,0,0,.6)` }}>
                    <GameCard card={duel.card} width={220} />
                </div>
                <DuelSide side="left" roll={duel.ownerRoll} players={players} me={me} role={t.duel.playedTheCard} preview={ownerPreview} onRoll={onRoll} />
            </section>

            <section className="duel3-side duel3-side--right" aria-label={t.duel.rollAria(challengerName)}>
                <img src={challengeArt} alt="Challenge" className="duel3-card duel3-card--challenge" />
                <DuelSide side="right" roll={duel.challengerRoll} players={players} me={me} role={t.duel.challenger} preview={challengerPreview} onRoll={onRoll} />
            </section>

            <div className="duel3-vs" aria-hidden="true">VS</div>
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
                onPreview={setPreview}
            />
        </Stage>
    );
}

export default DuelScene;
