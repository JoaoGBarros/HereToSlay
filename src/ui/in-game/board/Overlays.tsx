import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { getMonsterArt } from '@/utils/CardArt';
import { classInfo, partyClasses, type HeroClassId } from '@/utils/ClassInfo';
import { isMuted, setMuted } from '@/utils/SoundManager/SoundManager';
import { getMotionPref, setMotionPref } from '@/utils/motion';
import { LANGS, useI18n } from '@/i18n';
import { GameCard } from '../../common/GameCard';
import type { CardData, LogEntry, MonsterData, PlayerData, PlayersMap } from '../../common/types';
import { ClassPips, SlainMonsters } from './OpponentRail';
import { tagStyle } from './boardTypes';
import type { Highlight } from '../useMatchSession';
import { renderLog } from './logText';
import { Stage } from '../../common/Stage';
import victoryBackground from '../../assets/ingame.png';
import '../rolls/stage.css';
import '../components/css/ActionHistoryPanel.css';

function useEscape(onClose: () => void) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
}

function Sheet({ label, onClose, children, width = 1100 }: { label: string; onClose: () => void; children: React.ReactNode; width?: number }) {
    const { t } = useI18n();
    useEscape(onClose);
    return ReactDOM.createPortal(
        <div className="hts-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
            <div className="sheet hts-panel hts-rise" style={{ width: `min(${width}px, calc(100vw - 48px))` }} onClick={(e) => e.stopPropagation()}>
                <button type="button" className="hts-icon-btn sheet-close" aria-label={t.common.close} onClick={onClose}>✕</button>
                {children}
            </div>
        </div>,
        document.body,
    );
}

export function PartyViewer({ player, onClose, onInspect, onInspectMonster }: { player: PlayerData; onClose: () => void; onInspect: (card: CardData) => void; onInspectMonster: (m: MonsterData) => void }) {
    const { t } = useI18n();
    const info = classInfo(player.leader);
    const text = player.leader ? t.classes[player.leader as HeroClassId] : undefined;
    const heroes = player.party || [];
    return (
        <Sheet label={t.overlays.partyAria(player.username)} onClose={onClose}>
            <div style={{ display: 'flex', gap: 28 }}>
                {info && <img src={info.leaderArt} alt={info.leaderName} style={{ width: 190, height: 328, objectFit: 'cover', borderRadius: 14, flex: 'none' }} />}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <span className="hts-label">{t.overlays.partyOf}</span>
                    <h2 className="hts-display" style={{ fontSize: 44 }}>{player.username}</h2>
                    {info && text && <p style={{ margin: 0, color: 'var(--hts-text-2)', lineHeight: 1.45 }}><b style={{ color: info.tint }}>{info.leaderName}:</b> {text.skill}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <ClassPips have={partyClasses(player.leader, player.party)} size={24} />
                        <SlainMonsters slain={player.slain || []} width={34} onInspect={onInspectMonster} />
                        <span className="hts-chip hts-chip--muted">{t.overlays.handCards(player.handCount ?? 0)}</span>
                    </div>
                    <div className="viewer-heroes hts-scroll">
                        {heroes.length === 0 && <span className="hts-muted">{t.overlays.noHeroes}</span>}
                        {heroes.map((card) => (
                            <GameCard key={card.cardId} card={card} width={150} dimmed={player.usedCardIds?.includes(card.cardId)} onClick={() => onInspect(card)} />
                        ))}
                    </div>
                </div>
            </div>
        </Sheet>
    );
}

export function RulesSheet({ onClose }: { onClose: () => void }) {
    const { t } = useI18n();
    return (
        <Sheet label={t.overlays.rulesTitle} onClose={onClose}>
            <h2 className="hts-display" style={{ fontSize: 40, marginBottom: 18 }}>{t.overlays.rulesTitle}</h2>
            <div className="rules-grid">
                {t.overlays.rules.map((r) => (
                    <section key={r.title}>
                        <h3 className="rules-title">{r.title}</h3>
                        <ul className="rules-list">{r.items.map((i) => <li key={i}>{i}</li>)}</ul>
                    </section>
                ))}
                <section>
                    <h3 className="rules-title">{t.overlays.termsTitle}</h3>
                    <ul className="rules-list">{t.overlays.terms.map(([k, d]) => <li key={k}><b style={{ color: 'var(--hts-gold-text)' }}>{k}</b> — {d}</li>)}</ul>
                </section>
            </div>
        </Sheet>
    );
}

export function HandReveal({ username, reason, cards, onClose }: { username: string; reason: string; cards: CardData[]; onClose: () => void }) {
    const { t } = useI18n();
    const title = (t.engine.reveal[reason] ?? t.overlays.handOf)(username);
    return (
        <Sheet label={title} onClose={onClose}>
            <span className="hts-label">{t.overlays.onlyYou}</span>
            <h2 className="hts-display" style={{ fontSize: 40, margin: '6px 0 18px' }}>{title}</h2>
            <div className="viewer-heroes hts-scroll">
                {cards.length === 0 && <span className="hts-muted">{t.overlays.emptyHand}</span>}
                {cards.map((card) => <GameCard key={card.cardId} card={card} width={170} />)}
            </div>
        </Sheet>
    );
}

export function TurnBanner({ name, leader, isMe }: { name: string; leader?: string; isMe: boolean }) {
    const { t } = useI18n();
    const info = classInfo(leader);
    return (
        <div className="turn-banner" role="status">
            <div className="turn-banner-inner">
                {info && <img src={info.leaderArt} alt="" />}
                <span className="hts-display">{isMe ? t.overlays.yourTurn : t.overlays.turnOf(name)}</span>
            </div>
        </div>
    );
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
    const { t, lang, setLang } = useI18n();
    const [muted, setMutedState] = useState(isMuted());
    const [reduced, setReduced] = useState(getMotionPref() === 'reduced');
    const seg = (on: boolean) => `settings-opt ${on ? 'settings-opt--on' : ''}`;
    return (
        <Sheet label={t.engine.board.settings} onClose={onClose} width={520}>
            <h2 className="hts-display" style={{ fontSize: 40, marginBottom: 20 }}>{t.engine.board.settings}</h2>
            <div className="settings-grid">
                <span className="hts-label">{t.engine.board.sound}</span>
                <div className="settings-seg" role="group" aria-label={t.engine.board.sound}>
                    <button type="button" className={seg(!muted)} aria-pressed={!muted} onClick={() => { setMuted(false); setMutedState(false); }}>{t.engine.board.soundOn}</button>
                    <button type="button" className={seg(muted)} aria-pressed={muted} onClick={() => { setMuted(true); setMutedState(true); }}>{t.engine.board.soundOff}</button>
                </div>
                <span className="hts-label">{t.engine.board.motion}</span>
                <div className="settings-seg" role="group" aria-label={t.engine.board.motion}>
                    <button type="button" className={seg(!reduced)} aria-pressed={!reduced} onClick={() => { setMotionPref('full'); setReduced(false); }}>{t.engine.board.motionFull}</button>
                    <button type="button" className={seg(reduced)} aria-pressed={reduced} onClick={() => { setMotionPref('reduced'); setReduced(true); }}>{t.engine.board.motionReduced}</button>
                </div>
                <span className="hts-label">{t.engine.board.language}</span>
                <div className="settings-seg" role="group" aria-label={t.engine.board.language}>
                    {LANGS.map((l) => (
                        <button key={l.id} type="button" className={seg(lang === l.id)} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>{l.name}</button>
                    ))}
                </div>
            </div>
        </Sheet>
    );
}

export function DiscardViewer({ cards, onClose, onInspect }: { cards: CardData[]; onClose: () => void; onInspect: (card: CardData) => void }) {
    const { t } = useI18n();
    return (
        <Sheet label={t.engine.board.discardTitle} onClose={onClose}>
            <h2 className="hts-display" style={{ fontSize: 40, marginBottom: 18 }}>{t.engine.board.discardTitle} · {cards.length}</h2>
            <div className="viewer-heroes hts-scroll" style={{ maxHeight: '64vh' }}>
                {cards.length === 0 && <span className="hts-muted">{t.engine.board.discardEmpty}</span>}
                {cards.map((card) => <GameCard key={card.cardId} card={card} width={140} onClick={() => onInspect(card)} />)}
            </div>
        </Sheet>
    );
}

export function HistoryPanel({ log, players, onClose }: { log: LogEntry[]; players: PlayersMap; onClose: () => void }) {
    const { t } = useI18n();
    const entries = [...log].reverse();
    return (
        <aside className="history hts-fade" aria-label={t.history.aria}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 className="hts-display" style={{ fontSize: 30 }}>{t.history.title}</h2>
                <button type="button" className="hts-icon-btn" aria-label={t.history.close} onClick={onClose}>✕</button>
            </div>
            <ol className="history-list hts-scroll">
                {entries.length === 0 && <li className="hts-muted">{t.history.empty}</li>}
                {entries.map((entry) => entry.key === 'turn_start' ? (
                    <li key={entry.id} className="history-divider">{renderLog(t, entry, players)}</li>
                ) : (
                    <li key={entry.id} className={`history-item history-item--${entry.key}`}>
                        <time className="history-time">{new Date(entry.ts).toLocaleTimeString(t.history.locale, { hour: '2-digit', minute: '2-digit' })}</time>
                        <span>{renderLog(t, entry, players)}</span>
                    </li>
                ))}
            </ol>
        </aside>
    );
}

interface MatchEndProps {
    players: PlayersMap;
    winner: { playerId: string; reason: 'monsters' | 'classes' };
    round: number;
    startedAt?: number;
    log: LogEntry[];
    highlights: Highlight[];
    onHistory: () => void;
    onLeave: () => void;
}

const MINUTE_MS = 60000;

/** End of match, laid out like the design: winner and trophies, standings, Kafka Streams highlights, stats. */
export function MatchEnd({ players, winner, round, startedAt, log, highlights, onHistory, onLeave }: MatchEndProps) {
    const { t } = useI18n();
    const champion = players[winner.playerId];
    const info = classInfo(champion?.leader);
    const minutes = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / MINUTE_MS)) : null;
    const standings = Object.entries(players)
        .map(([pid, p]) => ({ pid, p, classes: partyClasses(p.leader, p.party).size, slain: (p.slain || []).length }))
        .sort((a, b) => Number(b.pid === winner.playerId) - Number(a.pid === winner.playerId) || b.slain - a.slain || b.classes - a.classes);
    const count = (key: string) => log.filter((e) => e.key === key).length;
    const stats: [number, string][] = [
        [round, t.engine.end.stats.rounds],
        [count('challenged'), t.engine.end.stats.challenges],
        [count('modifier'), t.engine.end.stats.modifiers],
        [count('destroyed'), t.engine.end.stats.destroyed],
    ];
    const badges = highlights.filter((h, i) => highlights.findIndex((x) => x.tagType === h.tagType && x.playerId === h.playerId) === i).slice(0, 6);

    return (
        <Stage label={t.overlays.endAria} className="vic3">
            <img src={victoryBackground} alt="" aria-hidden="true" className="vic3-bg" />
            <div className="vic3-glow" aria-hidden="true" />

            <section className="vic3-hero hts-rise" aria-label={t.engine.end.victory}>
                <div style={{ position: 'relative', flex: 'none' }}>
                    {info && <img src={info.leaderArt} alt={info.leaderName} className="vic3-leader" />}
                    <svg width="96" height="72" viewBox="0 0 96 72" aria-hidden="true" className="vic3-crown"><path d="M8 62 4 18l24 20L48 6l20 32 24-20-4 44z" fill="#e9b949" stroke="#7a5410" strokeWidth="4" strokeLinejoin="round" /></svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 24, minWidth: 0 }}>
                    <span className="vic3-kicker">{t.engine.end.victory}</span>
                    <h1 className="vic3-name">{champion?.username}</h1>
                    <span className="vic3-reason">{winner.reason === 'monsters' ? t.engine.end.byMonsters : t.engine.end.byClasses}</span>
                    {winner.reason === 'monsters' ? (
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            {(champion?.slain || []).map((m) => <img key={m.id} src={getMonsterArt(m.name)} alt={m.name} className="vic3-monster" />)}
                        </div>
                    ) : (
                        <ClassPips have={partyClasses(champion?.leader, champion?.party)} size={34} />
                    )}
                    <span className="vic3-meta">{t.engine.end.roundN(round)}{minutes ? ` · ${t.engine.end.minutes(minutes)}` : ''}</span>
                </div>
            </section>

            <section className="vic3-rank" aria-label={t.overlays.endTitle}>
                {standings.map((s, i) => {
                    const pinfo = classInfo(s.p.leader);
                    return (
                        <div key={s.pid} className={`vic3-row ${i === 0 ? 'vic3-row--first' : ''}`}>
                            <span className="vic3-pos">{i + 1}º</span>
                            {pinfo && <img src={pinfo.leaderArt} alt="" />}
                            <span className="vic3-row-name">{s.p.username}</span>
                            <span className="vic3-row-stat">{t.overlays.classesN(s.classes)}</span>
                            <span className="vic3-row-stat">{t.overlays.slainN(s.slain)}</span>
                        </div>
                    );
                })}
            </section>

            <section className="vic3-side" aria-label={t.engine.end.highlights}>
                <h2 className="vic3-h2">{t.engine.end.highlights}</h2>
                <div className="vic3-badges">
                    {badges.length === 0 && <p style={{ color: '#b9b2a3', margin: 0 }}>{t.engine.end.noHighlights}</p>}
                    {badges.map((b) => {
                        const style = tagStyle(b.tagType);
                        const fixed = t.tags[b.tagType as Exclude<keyof typeof t.tags, 'FOCUSING'>];
                        return (
                            <div key={b.key} className="vic3-badge">
                                <span className="vic3-badge-mark" style={{ background: style.bg, color: style.fg }}>{style.mark}</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontWeight: 800, fontSize: 15 }}>{typeof fixed === 'string' ? fixed : b.tagType} · {players[b.playerId]?.username}</span>
                                    <span style={{ fontSize: 13, lineHeight: 1.35, color: '#b9b2a3' }}>{t.engine.end.badgeText[b.tagType] ?? ''}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="vic3-stats">
                    {stats.map(([v, l]) => (
                        <div key={l} className="vic3-stat"><div className="vic3-stat-v">{v}</div><div className="vic3-stat-l">{l}</div></div>
                    ))}
                </div>
            </section>

            <footer className="vic3-foot">
                <button type="button" className="vic3-ghost" onClick={onHistory}>{t.engine.end.history}</button>
                <button type="button" className="vic3-cta" onClick={onLeave}>{t.engine.end.back}</button>
            </footer>
        </Stage>
    );
}
