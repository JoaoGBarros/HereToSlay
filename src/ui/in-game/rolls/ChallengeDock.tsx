import { useLayoutEffect, useRef } from 'react';
import { classInfo } from '@/utils/ClassInfo';
import { cardText } from '@/utils/cardText';
import { isReducedMotion } from '@/utils/motion';
import { uiZoom } from '@/utils/uiScale';
import { useI18n } from '@/i18n';
import challengeArt from '../../assets/cards/challenge.png';
import { GameCard } from '../../common/GameCard';
import type { CardData, ChallengeWindowPending, PlayersMap } from '../../common/types';
import { TimerRing } from '../../common/Widgets';
import { useWindowClock } from './RollParts';

interface ChallengeDockProps {
    pending: ChallengeWindowPending;
    players: PlayersMap;
    me: string;
    hand: CardData[];
    onChallenge: () => void;
    onPass: () => void;
}

const ARRIVAL_MS = 750;

/** The played card flies in from its owner's plaque, so the rest of the table sees it being played. */
function useArrival(ownerId: string, cardId: number, show: boolean) {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || !show || isReducedMotion()) return;
        const from = document.querySelector(`[data-fx-player="${CSS.escape(ownerId)}"]`)?.getBoundingClientRect();
        const to = el.getBoundingClientRect();
        if (!from) return;
        const zoom = uiZoom();
        const dx = (from.left + from.width / 2 - (to.left + to.width / 2)) / zoom;
        const dy = (from.top + from.height / 2 - (to.top + to.height / 2)) / zoom;
        const animation = el.animate(
            [
                { transform: `translate(${dx}px, ${dy}px) scale(0.35) rotate(-10deg)`, opacity: 0 },
                { transform: `translate(${dx * 0.3}px, ${dy * 0.3}px) scale(1.15) rotate(3deg)`, opacity: 1, offset: 0.6 },
                { transform: 'none', opacity: 1 },
            ],
            { duration: ARRIVAL_MS, easing: 'cubic-bezier(.2,.8,.2,1)' },
        );
        return () => animation.cancel();
    }, [ownerId, cardId, show]);
    return ref;
}

/** A card was played: players holding a Challenge decide whether to spend it. */
function ChallengeDock({ pending, players, me, hand, onChallenge, onPass }: ChallengeDockProps) {
    const { t, lang } = useI18n();
    const { fraction, seconds } = useWindowClock(pending.remainingMs, pending.durationMs);
    const owner = players[pending.ownerId];
    const canAct = pending.eligible.includes(me) && !pending.passed.includes(me);
    const isOwner = pending.ownerId === me;
    const hasChallenge = hand.some((c) => c.type === 'CHALLENGE');
    const arrivalRef = useArrival(pending.ownerId, pending.card.cardId, !isOwner);
    const effect = cardText(pending.card);
    const rollTarget = pending.card.type === 'HERO' ? pending.card.diceValue : undefined;

    return (
        <section className="chal-dock hts-rise" aria-label={t.phase.challengeWindow} aria-live="polite">
            <div ref={arrivalRef} className="chal-dock-card">
                <GameCard card={pending.card} width={150} style={{ boxShadow: `0 0 0 3px ${classInfo(owner?.leader)?.tint ?? 'var(--hts-sky)'}, 0 18px 40px rgba(0,0,0,.6)` }} />
            </div>
            <div className="chal-dock-info">
                <span className="hts-label" style={{ color: 'var(--hts-ember-text)' }}>{t.phase.challengeWindow}</span>
                <h2 className="hts-display" style={{ fontSize: 34 }}>{t.engine.challenge.played(isOwner ? t.common.you : owner?.username ?? '', pending.card.cardName ?? '')}</h2>
                {effect && (
                    <div className="chal-dock-effect">
                        {rollTarget != null && <span className="hts-label">{t.engine.heroScene.ifSuccess(rollTarget)}</span>}
                        <p>{effect[lang]}</p>
                    </div>
                )}
                <p className="hts-muted" style={{ margin: 0, fontSize: 14 }}>{canAct ? (hasChallenge ? t.engine.challenge.canChallenge : t.engine.challenge.noCard) : isOwner ? t.engine.challenge.waitingOthers : t.engine.challenge.cannot}</p>
                <div className="chal-dock-who">
                    {pending.eligible.map((pid) => (
                        <span key={pid} className={`hts-chip ${pending.passed.includes(pid) ? 'hts-chip--muted' : 'hts-chip--ember'}`}>
                            {pid === me ? t.common.you : players[pid]?.username} · {pending.passed.includes(pid) ? t.engine.challenge.passed : t.engine.challenge.thinking}
                        </span>
                    ))}
                </div>
            </div>
            <div className="chal-dock-actions">
                <TimerRing fraction={fraction} size={64} label={String(seconds)} color="var(--hts-ember)" />
                {canAct && (
                    <>
                        <button type="button" className="hts-btn hts-btn--danger chal-dock-btn" onClick={onChallenge} disabled={!hasChallenge}>
                            <img src={challengeArt} alt="" />
                            {t.engine.challenge.challenge}
                        </button>
                        <button type="button" className="hts-btn hts-btn--ghost" onClick={onPass}>{t.engine.challenge.pass}</button>
                    </>
                )}
            </div>
        </section>
    );
}

export default ChallengeDock;
