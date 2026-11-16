import type { MatchSummary } from '@/api/accountsClient';
import { useI18n } from '@/i18n';
import { CLASS_INFO, type HeroClassId } from '@/utils/ClassInfo';
import { formatDateTime } from './format';

type Props = {
    matches: MatchSummary[];
    hasMore: boolean;
    isLoadingMore: boolean;
    onLoadMore: () => void;
};

function isHeroClass(value: string | null): value is HeroClassId {
    return value != null && value in CLASS_INFO;
}

function MatchRow({ match }: { match: MatchSummary }) {
    const { t, lang } = useI18n();
    const leader = isHeroClass(match.partyLeader) ? match.partyLeader : null;
    const minutes = Math.floor(match.durationSeconds / 60);
    const result = match.won ? t.profile.won : t.profile.place(match.position);

    return (
        <li className={`profile-match${match.won ? ' profile-match--won' : ''}`}>
            <span className="profile-match-result hts-display">{result}</span>
            <div className="profile-match-leader">
                {leader ? (
                    <>
                        <img src={CLASS_INFO[leader].icon} alt="" width={28} height={28} />
                        <span>{t.classes[leader].label}</span>
                    </>
                ) : (
                    <span className="hts-muted">{t.profile.noLeader}</span>
                )}
            </div>
            <div className="profile-match-info">
                <span>{t.profile.conditions[match.winCondition]} · {match.won ? t.profile.playersCount(match.playerCount) : t.profile.winnerWas(match.winnerUsername)}</span>
                <span className="hts-muted">{formatDateTime(match.finishedAt, lang)} · {t.profile.duration(minutes)} · {t.profile.slainShort(match.monstersSlain)}</span>
            </div>
        </li>
    );
}

/** The player's finished matches, newest first. */
export function MatchHistory({ matches, hasMore, isLoadingMore, onLoadMore }: Props) {
    const { t } = useI18n();

    return (
        <section className="profile-history hts-panel" aria-labelledby="profile-history-h">
            <h2 id="profile-history-h" className="hts-label">{t.profile.history}</h2>
            {matches.length === 0 ? (
                <p className="hts-muted profile-empty-line">{t.profile.noMatches}</p>
            ) : (
                <ul className="profile-matches">
                    {matches.map((match) => <MatchRow key={match.matchId} match={match} />)}
                </ul>
            )}
            {hasMore && (
                <button type="button" className="hts-btn hts-btn--ghost hts-btn--sm profile-more" disabled={isLoadingMore} onClick={onLoadMore}>
                    {isLoadingMore ? t.profile.loading : t.profile.loadMore}
                </button>
            )}
        </section>
    );
}
