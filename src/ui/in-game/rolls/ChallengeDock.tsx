import { classInfo } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import challengeArt from '../../assets/cards/challenge.png';
import { GameCard } from '../../common/GameCard';
import type { ChallengeWindowPending, PlayersMap } from '../../common/types';
import { TimerRing } from '../../common/Widgets';
import { useWindowClock } from './RollParts';

interface ChallengeDockProps {
    pending: ChallengeWindowPending;
    players: PlayersMap;
    me: string;
    onChallenge: () => void;
    onPass: () => void;
}

/** A card was played: players holding a Challenge decide whether to spend it. */
function ChallengeDock({ pending, players, me, onChallenge, onPass }: ChallengeDockProps) {
    const { t } = useI18n();
    const { fraction, seconds } = useWindowClock(pending.remainingMs, pending.durationMs);
    const owner = players[pending.ownerId];
    const canAct = pending.eligible.includes(me) && !pending.passed.includes(me);
    const isOwner = pending.ownerId === me;

    return (
        <section className="chal-dock hts-rise" aria-label={t.phase.challengeWindow} aria-live="polite">
            <GameCard card={pending.card} width={150} style={{ boxShadow: `0 0 0 3px ${classInfo(owner?.leader)?.tint ?? 'var(--hts-sky)'}, 0 18px 40px rgba(0,0,0,.6)` }} />
            <div className="chal-dock-info">
                <span className="hts-label" style={{ color: 'var(--hts-ember-text)' }}>{t.phase.challengeWindow}</span>
                <h2 className="hts-display" style={{ fontSize: 34 }}>{t.engine.challenge.played(isOwner ? t.common.you : owner?.username ?? '', pending.card.cardName ?? '')}</h2>
                <p className="hts-muted" style={{ margin: 0, fontSize: 14 }}>{canAct ? t.engine.challenge.canChallenge : isOwner ? t.engine.challenge.waitingOthers : t.engine.challenge.cannot}</p>
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
                        <button type="button" className="hts-btn hts-btn--danger chal-dock-btn" onClick={onChallenge}>
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
