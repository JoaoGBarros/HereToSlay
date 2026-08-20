import { getMonsterArt } from '@/utils/CardArt';
import { monsterRequirement, useI18n } from '@/i18n';
import deckBack from '../../assets/deck.png';
import type { MonsterData } from '../../common/types';
import { TONE_COLOR, type FeedEvent } from './boardTypes';

interface ArenaProps {
    monsters: MonsterData[];
    canDraw: boolean;
    canAttack: boolean;
    feed: FeedEvent[];
    onDraw: () => void;
    onAttack: (monsterId: number) => void;
    onInspectMonster: (monster: MonsterData) => void;
    onOpenHistory: () => void;
}

function Arena({ monsters, canDraw, canAttack, feed, onDraw, onAttack, onInspectMonster, onOpenHistory }: ArenaProps) {
    const { t } = useI18n();
    return (
        <section className="arena" aria-label={t.board.centerAria}>
            <div className="arena-deck">
                <div className="arena-deck-stack" data-fx="deck">
                    <img src={deckBack} alt="" className="arena-deck-shadow" style={{ left: 6, top: 6 }} />
                    <img src={deckBack} alt="" className="arena-deck-shadow" style={{ left: 3, top: 3 }} />
                    <button
                        type="button"
                        className={`arena-deck-top ${canDraw ? 'arena-deck-top--ready' : ''}`}
                        disabled={!canDraw}
                        onClick={onDraw}
                        aria-label={t.board.drawAria}
                    >
                        <img src={deckBack} alt="" />
                    </button>
                </div>
                <span className="arena-caption">{canDraw ? t.board.draw : t.board.deck}</span>
            </div>

            <div className="arena-monsters" aria-label={t.board.monstersAria}>
                {monsters.slice(0, 3).map((m) => {
                    const art = getMonsterArt(m.name);
                    return (
                        <article key={m.id} className="monster-tile hts-fade">
                            <button type="button" className="monster-art" onClick={() => onInspectMonster(m)} aria-label={t.board.viewCard(m.name)}>
                                {art ? <img src={art} alt="" /> : <span className="hts-display">{m.name}</span>}
                            </button>
                            <div className="monster-info">
                                <span className="monster-req">{m.partyRequirement ? monsterRequirement(t, m.partyRequirement) : t.board.noReq}</span>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    <span className="monster-zone monster-zone--win">{t.board.slay(m.slayThreshold)}</span>
                                    <span className="monster-zone monster-zone--fail">{t.board.fightBack(m.fightBackThreshold)}</span>
                                </div>
                            </div>
                            {canAttack && (
                                <button type="button" className="hts-btn hts-btn--sm monster-attack" onClick={() => onAttack(m.id)}>
                                    {t.board.attack(2)}
                                </button>
                            )}
                        </article>
                    );
                })}
                {monsters.length === 0 && <p className="hts-muted">{t.board.noMonsters}</p>}
            </div>

            <div className="arena-feed" aria-live="polite">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 className="hts-display" style={{ fontSize: 22 }}>{t.board.events}</h2>
                    <button type="button" className="arena-link" onClick={onOpenHistory}>{t.board.seeHistory}</button>
                </div>
                {feed.length === 0 && <p className="hts-muted" style={{ margin: 0, fontSize: 14 }}>{t.board.eventsEmpty}</p>}
                {feed.slice(0, 5).map((e) => (
                    <div key={e.id} className="arena-feed-item hts-rise">
                        <span className="arena-feed-dot" style={{ background: TONE_COLOR[e.tone] }} />
                        <span>{e.render(t)}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default Arena;
