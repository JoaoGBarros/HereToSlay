import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { classInfo, partyClasses, type HeroClassId } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import { GameCard } from '../../common/GameCard';
import type { CardData, PlayerData, PlayersMap } from '../../common/types';
import { ClassPips, SlainSlots } from './OpponentRail';

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

export function PartyViewer({ player, slainCount, onClose, onInspect }: { player: PlayerData; slainCount: number; onClose: () => void; onInspect: (card: CardData) => void }) {
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
                        <SlainSlots count={slainCount} width={22} />
                        <span className="hts-chip hts-chip--muted">{t.overlays.handCards(player.hand?.length ?? 0)}</span>
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

export function HandReveal({ username, cards, onClose }: { username: string; cards: CardData[]; onClose: () => void }) {
    const { t } = useI18n();
    return (
        <Sheet label={t.overlays.handOf(username)} onClose={onClose}>
            <span className="hts-label">{t.overlays.onlyYou}</span>
            <h2 className="hts-display" style={{ fontSize: 40, margin: '6px 0 18px' }}>{t.overlays.handOf(username)}</h2>
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

export function MatchEnd({ players, slain, onLeave }: { players: PlayersMap; slain: Record<string, number>; onLeave: () => void }) {
    const { t } = useI18n();
    const standings = Object.entries(players)
        .map(([pid, p]) => ({ pid, p, classes: partyClasses(p.leader, p.party).size, slain: slain[pid] || 0 }))
        .sort((a, b) => b.slain - a.slain || b.classes - a.classes);
    return ReactDOM.createPortal(
        <div className="hts-overlay" role="dialog" aria-modal="true" aria-label={t.overlays.endAria}>
            <div className="sheet hts-panel hts-rise" style={{ width: 'min(720px, calc(100vw - 48px))' }}>
                <span className="hts-label" style={{ color: 'var(--hts-gold-text)' }}>{t.overlays.endKicker}</span>
                <h2 className="hts-display" style={{ fontSize: 56, margin: '6px 0 18px' }}>{t.overlays.endTitle}</h2>
                <ol className="end-list">
                    {standings.map((s, i) => {
                        const info = classInfo(s.p.leader);
                        return (
                            <li key={s.pid} className={i === 0 ? 'end-row end-row--first' : 'end-row'}>
                                <span className="hts-display" style={{ fontSize: 22, color: 'var(--hts-dim)', width: 30 }}>{i + 1}º</span>
                                {info && <img src={info.leaderArt} alt="" className="plaque-avatar" />}
                                <span style={{ flex: 1, fontWeight: 800 }}>{s.p.username}</span>
                                <span className="hts-muted">{t.overlays.classesN(s.classes)}</span>
                                <span className="hts-muted">{t.overlays.slainN(s.slain)}</span>
                            </li>
                        );
                    })}
                </ol>
                <button type="button" className="hts-btn" style={{ marginTop: 20 }} onClick={onLeave}>{t.overlays.backToTavern}</button>
            </div>
        </div>,
        document.body,
    );
}
