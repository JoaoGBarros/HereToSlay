import { getMonsterArt } from '@/utils/CardArt';
import { CLASS_IDS, CLASS_INFO, classInfo, partyClasses, type HeroClassId } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import { GameCard } from '../../common/GameCard';
import type { MonsterData, PlayersMap } from '../../common/types';
import { tagStyle, type PlayerTag } from './boardTypes';

const MAX_MINIS = 6;
const MONSTERS_TO_WIN = 3;

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

/** Slain monsters show their own art; the empty slots count down to the 3-monster win. */
export function SlainMonsters({ slain, width = 16, vertical, onInspect }: { slain: MonsterData[]; width?: number; vertical?: boolean; onInspect?: (m: MonsterData) => void }) {
    const { t } = useI18n();
    const height = Math.round(width * 1.72);
    return (
        <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: vertical ? 8 : 3 }} role="img" aria-label={t.common.slainAria(slain.length)}>
            {Array.from({ length: MONSTERS_TO_WIN }).map((_, i) => {
                const m = slain[i];
                if (!m) {
                    return <span key={i} style={{ width, height, boxSizing: 'border-box', borderRadius: 4, border: '2px dashed rgba(243,234,214,.32)' }} />;
                }
                const art = getMonsterArt(m.name);
                const style = { width, height, borderRadius: 4, objectFit: 'cover' as const, objectPosition: 'top', border: '2px solid var(--hts-gold)', boxSizing: 'border-box' as const, padding: 0, background: 'var(--hts-gold)' };
                const image = art ? <img src={art} alt="" style={{ ...style, display: 'block' }} title={m.name} /> : <span style={{ ...style, display: 'block' }} title={m.name} />;
                return onInspect ? (
                    <button key={m.id} type="button" className="slain-btn" onClick={() => onInspect(m)} aria-label={m.name}>{image}</button>
                ) : <span key={m.id}>{image}</span>;
            })}
        </div>
    );
}

export function PlayerTags({ tags, big }: { tags: PlayerTag[]; big?: boolean }) {
    const { t } = useI18n();
    if (tags.length === 0) return null;
    return (
        <div className={`ks-tags ${big ? 'ks-tags--big' : ''}`}>
            {tags.slice(-3).map((tag) => {
                const style = tagStyle(tag.tagType);
                return (
                    <span key={tag.key} className="ks-tag hts-pop" style={{ background: style.bg, color: style.fg }}>
                        <span className="ks-tag-mark">{style.mark}</span>
                        {tag.render(t)}
                    </span>
                );
            })}
        </div>
    );
}

interface OpponentRailProps {
    players: PlayersMap;
    ids: string[];
    turn: string;
    tags: Record<string, PlayerTag[]>;
    disconnected: string[];
    onOpen: (playerId: string) => void;
}

function OpponentRail({ players, ids, turn, tags, disconnected, onOpen }: OpponentRailProps) {
    const { t } = useI18n();
    if (ids.length === 0) return null;
    return (
        <section className="rail" aria-label={t.board.opponents} style={{ gridTemplateColumns: `repeat(${ids.length}, minmax(0, 1fr))` }}>
            {ids.map((pid) => {
                const p = players[pid];
                const info = classInfo(p.leader);
                const heroes = p.party || [];
                const slain = p.slain || [];
                const have = partyClasses(p.leader, p.party);
                const threat = slain.length >= 2 || have.size >= 5;
                return (
                    <button
                        key={pid}
                        type="button"
                        className={`plaque ${pid === turn ? 'plaque--turn' : ''} ${threat ? 'plaque--threat' : ''} ${p.leftReason ? 'plaque--left' : ''}`}
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
                                {p.handCount ?? 0}
                            </span>
                        </div>
                        <div className="plaque-heroes">
                            {heroes.slice(0, MAX_MINIS).map((card) => (
                                <GameCard key={card.cardId} card={card} width={38} className="hts-fade" dimmed={p.usedCardIds?.includes(card.cardId)} />
                            ))}
                            {heroes.length > MAX_MINIS && <span className="plaque-more">+{heroes.length - MAX_MINIS}</span>}
                            {heroes.length === 0 && <span className="plaque-empty">{t.board.noHeroes}</span>}
                        </div>
                        <div className="plaque-foot">
                            <ClassPips have={have} />
                            <SlainMonsters slain={slain} />
                        </div>
                        <PlayerTags tags={tags[pid] || []} />
                        {(p.leftReason || disconnected.includes(pid)) && (
                            <span className={`presence-badge ${p.leftReason ? 'presence-badge--left' : ''}`}>
                                {p.leftReason ? t.engine.presence.badgeLeft : t.engine.presence.badgeOffline}
                            </span>
                        )}
                        {threat && <span className="plaque-threat">{slain.length >= 2 ? t.board.oneMonsterLeft : t.board.classesShort(have.size)}</span>}
                    </button>
                );
            })}
        </section>
    );
}

export default OpponentRail;
