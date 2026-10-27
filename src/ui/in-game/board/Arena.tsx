import type { ReactNode } from 'react';
import { getMonsterArt } from '@/utils/CardArt';
import { useI18n } from '@/i18n';
import deckBack from '../../assets/deck.png';
import { GameCard } from '../../common/GameCard';
import type { CardData, MonsterData } from '../../common/types';

interface ArenaProps {
    monsters: MonsterData[];
    drawPileCount: number;
    discardPile: CardData[];
    monsterDeckCount: number;
    canDraw: boolean;
    canAttack: boolean;
    onDraw: () => void;
    onAttack: (monsterId: number) => void;
    onInspectMonster: (monster: MonsterData) => void;
    /** The chat sits where the old events feed was. */
    side: ReactNode;
    /** The chat is tucked away: only its tab shows. */
    sideCollapsed?: boolean;
}

function Arena({ monsters, drawPileCount, discardPile, monsterDeckCount, canDraw, canAttack, onDraw, onAttack, onInspectMonster, side, sideCollapsed }: ArenaProps) {
    const { t } = useI18n();
    const top = discardPile[0];
    const under = discardPile[1];
    return (
        <section className="arena" aria-label={t.board.centerAria}>
            <div className="arena-decks">
                <div className="arena-deck">
                    <div className="arena-deck-stack" data-fx="deck">
                        {drawPileCount > 2 && <img src={deckBack} alt="" className="arena-deck-shadow" style={{ left: 6, top: 6 }} />}
                        {drawPileCount > 1 && <img src={deckBack} alt="" className="arena-deck-shadow" style={{ left: 3, top: 3 }} />}
                        <button
                            type="button"
                            className={`arena-deck-top ${canDraw ? 'arena-deck-top--ready' : ''}`}
                            disabled={!canDraw || drawPileCount === 0}
                            onClick={onDraw}
                            aria-label={t.board.drawAria}
                        >
                            <img src={deckBack} alt="" />
                        </button>
                    </div>
                    <span className="arena-caption">{t.engine.board.deckCount(drawPileCount)}</span>
                </div>
                <div className="arena-deck">
                    <div className="arena-discard" aria-label={t.engine.board.discardTitle} data-fx="discard">
                        {under && <GameCard card={under} width={112} className="arena-discard-under" />}
                        {top ? <GameCard key={top.cardId} card={top} width={112} className="arena-discard-top hts-pop" /> : <span className="arena-discard-empty" />}
                    </div>
                    <span className="arena-caption">{t.engine.board.discardCount(discardPile.length)}</span>
                </div>
            </div>

            <div className="arena-monsters" aria-label={t.board.monstersAria}>
                {monsters.slice(0, 3).map((m) => {
                    const art = getMonsterArt(m.name);
                    return (
                        <article key={m.id} className="monster-tile hts-fade">
                            <button type="button" className="monster-art" onClick={() => onInspectMonster(m)} aria-label={t.board.viewCard(m.name)}>
                                {art ? <img src={art} alt="" /> : <span className="hts-display">{m.name}</span>}
                            </button>
                            {canAttack && (
                                <button type="button" className="hts-btn hts-btn--sm monster-attack" onClick={() => onAttack(m.id)}>
                                    {t.board.attack(2)}
                                </button>
                            )}
                        </article>
                    );
                })}
                {monsters.length === 0 && <p className="hts-muted">{t.board.noMonsters}</p>}
                <div className="monster-deck" aria-label={`${t.engine.board.monsterDeck}: ${monsterDeckCount}`}>
                    <div className="monster-deck-stack"><span className="hts-display">{monsterDeckCount}</span></div>
                    <span className="arena-caption">{t.engine.board.monsterDeck}</span>
                </div>
            </div>

            <div className={`arena-side ${sideCollapsed ? 'arena-side--collapsed' : ''}`}>{side}</div>
        </section>
    );
}

export default Arena;
