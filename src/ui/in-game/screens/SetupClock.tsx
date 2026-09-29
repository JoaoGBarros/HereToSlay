import { useI18n } from '@/i18n';
import { TimerRing } from '../../common/Widgets';
import { useWindowClock } from '../rolls/RollParts';

const DURATION_MS = { initiative: 10000, leader: 20000 };

/** The setup timer: when it runs out the initiative rolls itself, or a Party Leader is drawn. */
function SetupClock({ remainingMs, kind }: { remainingMs: number; kind: 'initiative' | 'leader' }) {
    const { t } = useI18n();
    const { fraction, seconds } = useWindowClock(remainingMs, DURATION_MS[kind]);
    return (
        <div className="setup-clock" role="timer" aria-live="off">
            <TimerRing fraction={fraction} size={44} label={String(seconds)} />
            <span>{kind === 'initiative' ? t.engine.setupClock.initiative(seconds) : t.engine.setupClock.leader(seconds)}</span>
        </div>
    );
}

export default SetupClock;
