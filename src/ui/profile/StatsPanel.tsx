import type { PlayerStats } from '@/api/accountsClient';
import { useI18n } from '@/i18n';
import { winRate } from './format';

type Props = {
    stats: PlayerStats;
};

/** Lifetime totals: the headline record, how the wins came, and monsters slain. */
export function StatsPanel({ stats }: Props) {
    const { t } = useI18n();
    const rate = winRate(stats.wins, stats.matchesPlayed);
    const byLastStanding = Math.max(0, stats.wins - stats.winsByClasses - stats.winsByMonsters);
    const ways = [
        { key: 'classes', label: t.profile.byClasses, value: stats.winsByClasses },
        { key: 'monsters', label: t.profile.byMonsters, value: stats.winsByMonsters },
        { key: 'standing', label: t.profile.byLastStanding, value: byLastStanding },
    ];

    return (
        <section className="profile-stats hts-panel" aria-labelledby="profile-stats-h">
            <h2 id="profile-stats-h" className="hts-label">{t.profile.stats}</h2>

            <div className="profile-record">
                <div className="profile-record-main">
                    <span className="profile-big hts-display">{stats.wins}</span>
                    <span className="profile-big-label">{t.profile.wins}</span>
                </div>
                <dl className="profile-record-side">
                    <div><dt>{t.profile.losses}</dt><dd className="hts-display">{stats.losses}</dd></div>
                    <div><dt>{t.profile.played}</dt><dd className="hts-display">{stats.matchesPlayed}</dd></div>
                    <div><dt>{t.profile.winRate}</dt><dd className="hts-display">{rate == null ? '–' : `${rate}%`}</dd></div>
                </dl>
            </div>

            <div className="profile-ways">
                <h3 className="hts-label">{t.profile.howWon}</h3>
                {stats.wins === 0 ? (
                    <p className="hts-muted profile-empty-line">{t.profile.noWinsYet}</p>
                ) : (
                    <>
                        <div className="profile-ways-bar" aria-hidden="true">
                            {ways.filter((w) => w.value > 0).map((w) => (
                                <span key={w.key} className={`profile-way profile-way--${w.key}`} style={{ flexGrow: w.value }} />
                            ))}
                        </div>
                        <ul className="profile-ways-legend">
                            {ways.map((w) => (
                                <li key={w.key}>
                                    <span className={`profile-dot profile-way--${w.key}`} aria-hidden="true" />
                                    <span>{w.label}</span>
                                    <strong>{w.value}</strong>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            <div className="profile-slain">
                <span className="profile-slain-value hts-display">{stats.monstersSlainTotal}</span>
                <span className="hts-label">{t.profile.monstersSlain}</span>
            </div>
        </section>
    );
}
