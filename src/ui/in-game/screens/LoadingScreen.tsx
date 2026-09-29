import { PLAYER_COLORS } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import type { PlayersMap } from '../../common/types';
import { Avatar, TimerRing } from '../../common/Widgets';
import { useWindowClock } from '../rolls/RollParts';
import './screens.css';

const LOADING_MS = 30000;

interface LoadingScreenProps {
    players: PlayersMap;
    me: string;
    loaded: string[];
    remainingMs: number;
}

/** Everyone opens the match before the initiative roll; whoever doesn't arrive in time is left out. */
function LoadingScreen({ players, me, loaded, remainingMs }: LoadingScreenProps) {
    const { t } = useI18n();
    const { fraction, seconds } = useWindowClock(remainingMs, LOADING_MS);
    const ids = Object.keys(players);
    const ready = ids.filter((pid) => loaded.includes(pid)).length;

    return (
        <section className="prep-screen" aria-labelledby="loading-h">
            <header className="prep-header">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span className="hts-label">{t.engine.loading.kicker}</span>
                    <h1 id="loading-h" className="hts-display" style={{ fontSize: 54 }}>{t.engine.loading.title}</h1>
                    <p className="prep-lead">{t.engine.loading.lead}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <TimerRing fraction={fraction} size={64} label={String(seconds)} />
                    <span className="hts-muted" style={{ maxWidth: 220, fontSize: 14, lineHeight: 1.4 }}>{t.engine.loading.timeout}</span>
                </div>
            </header>

            <div className="init-trays" style={{ gridTemplateColumns: `repeat(${Math.min(ids.length, 6)}, minmax(0, 1fr))` }}>
                {ids.map((pid, index) => {
                    const player = players[pid];
                    const isReady = loaded.includes(pid);
                    return (
                        <article key={pid} className={`init-tray ${pid === me ? 'init-tray--mine' : ''}`}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Avatar name={player.username} color={PLAYER_COLORS[index % PLAYER_COLORS.length]} />
                                <div style={{ minWidth: 0, lineHeight: 1.15 }}>
                                    <div className="init-name">{player.username}{pid === me ? t.common.youSuffix : ''}</div>
                                    <div className="init-state" data-tone={isReady ? 'done' : 'wait'}>
                                        {isReady ? t.engine.loading.ready : t.engine.loading.connecting}
                                    </div>
                                </div>
                            </div>
                            <div className="init-felt">
                                <span className={`loading-dot ${isReady ? 'loading-dot--ready' : ''}`} aria-hidden="true" />
                            </div>
                        </article>
                    );
                })}
            </div>

            <footer className="prep-ladder hts-panel">
                <div className="hts-display" style={{ fontSize: 24 }}>{t.engine.loading.count(ready, ids.length)}</div>
            </footer>
        </section>
    );
}

export default LoadingScreen;
