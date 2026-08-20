import { CLASS_IDS, CLASS_INFO, classInfo, partyClasses, type HeroClassId } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import { GameCard } from '../../common/GameCard';
import type { PlayersMap } from '../../common/types';
import type { CardRemoval, PlayerTag } from './boardTypes';

const MAX_MINIS = 6;

export function ClassPips({ have, size = 18 }: { have: Set<string>; size?: number }) {
    const { t } = useI18n();
    return (
        <div style={{ display: 'flex', gap: 3 }} role="img" aria-label={t.common.classesAria(have.size)}>
            {CLASS_IDS.map((id) => (
                <img
                    key={id}
                    src={CLASS_INFO[id].icon}
                    alt=""
                    title={t.classes[id].label}
                    style={{ width: size, height: size, borderRadius: '50%', ...(have.has(id) ? {} : { filter: 'grayscale(1)', opacity: 0.22 }) }}
                />
            ))}
        </div>
    );
}

export function SlainSlots({ count, width = 14 }: { count: number; width?: number }) {
    const { t } = useI18n();
    return (
        <div style={{ display: 'flex', gap: 3 }} role="img" aria-label={t.common.slainAria(count)}>
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    style={{
                        width,
                        height: Math.round(width * 1.45),
                        boxSizing: 'border-box',
                        borderRadius: 3,
                        ...(i < count ? { background: 'var(--hts-gold)' } : { border: '2px dashed rgba(243,234,214,.38)' }),
                    }}
                />
            ))}
        </div>
    );
}

interface OpponentRailProps {
    players: PlayersMap;
    ids: string[];
    turn: string;
    slain: Record<string, number>;
    tags: Record<string, PlayerTag[]>;
    removal: CardRemoval | null;
    onOpen: (playerId: string) => void;
}

function OpponentRail({ players, ids, turn, slain, tags, removal, onOpen }: OpponentRailProps) {
    const { t } = useI18n();
    if (ids.length === 0) return null;
    return (
        <section className="rail" aria-label={t.board.opponents} style={{ gridTemplateColumns: `repeat(${ids.length}, minmax(0, 1fr))` }}>
            {ids.map((pid) => {
                const p = players[pid];
                const info = classInfo(p.leader);
                const heroes = (p.party || []).filter((c) => c.type !== 'MONSTER');
                const slainCount = slain[pid] || 0;
                const have = partyClasses(p.leader, p.party);
                const threat = slainCount >= 2 || have.size >= 5;
                return (
                    <button
                        key={pid}
                        type="button"
                        className={`plaque ${pid === turn ? 'plaque--turn' : ''} ${threat ? 'plaque--threat' : ''}`}
                        onClick={() => onOpen(pid)}
                        data-fx-player={pid}
                        aria-label={t.board.viewParty(p.username)}
                    >
                        <div className="plaque-head">
                            {info ? (
                                <img src={info.leaderArt} alt="" className="plaque-avatar" style={{ boxShadow: `0 0 0 2px ${info.tint}` }} />
                            ) : (
                                <span className="plaque-avatar plaque-avatar--empty" />
                            )}
                            <div className="plaque-name">
                                <span>{p.username}</span>
                                <small>{info ? `${info.leaderName} · ${t.classes[p.leader as HeroClassId].label}` : t.board.noLeader}</small>
                            </div>
                            <span className="plaque-hand" title={t.board.handCount}>
                                <svg width="13" height="16" viewBox="0 0 14 16" aria-hidden="true"><rect x="1" y="1" width="12" height="14" rx="2" fill="#f3ead6" /><rect x="3.5" y="3.5" width="7" height="9" rx="1" fill="none" stroke="#8e897e" /></svg>
                                {p.hand?.length ?? 0}
                            </span>
                        </div>
                        <div className="plaque-heroes">
                            {heroes.slice(0, MAX_MINIS).map((card) => (
                                <GameCard
                                    key={card.cardId}
                                    card={card}
                                    width={38}
                                    className={removal?.cardId === card.cardId ? (removal.kind === 'steal' ? 'hts-steal' : 'hts-destroy') : 'hts-fade'}
                                    dimmed={p.usedCardIds?.includes(card.cardId)}
                                />
                            ))}
                            {heroes.length > MAX_MINIS && <span className="plaque-more">+{heroes.length - MAX_MINIS}</span>}
                            {heroes.length === 0 && <span className="plaque-empty">{t.board.noHeroes}</span>}
                        </div>
                        <div className="plaque-foot">
                            <ClassPips have={have} />
                            <SlainSlots count={slainCount} />
                        </div>
                        {(tags[pid] || []).length > 0 && (
                            <div className="plaque-tags">
                                {tags[pid].slice(-2).map((tag) => <span key={tag.key} className="plaque-tag">{tag.render(t)}</span>)}
                            </div>
                        )}
                        {threat && <span className="plaque-threat">{slainCount >= 2 ? t.board.oneMonsterLeft : t.board.classesShort(have.size)}</span>}
                    </button>
                );
            })}
        </section>
    );
}

export default OpponentRail;
