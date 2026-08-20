import { useDrag, useDrop } from 'react-dnd';
import { classInfo, partyClasses, type HeroClassId } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import { GameCard } from '../../common/GameCard';
import type { CardData, PlayerData } from '../../common/types';
import { ClassPips, SlainSlots } from './OpponentRail';
import { DRAG_CARD, type CardRemoval, type HandRemoval, type PlayerTag } from './boardTypes';

const PLAYABLE_TYPES = ['HERO', 'MAGIC', 'ITEM'];

export function isPlayableFromHand(card: CardData): boolean {
    return PLAYABLE_TYPES.includes(card.type || '');
}

function HandCard({ card, style, removal, onInspect }: { card: CardData; style: React.CSSProperties; removal: HandRemoval | null; onInspect: () => void }) {
    const { t } = useI18n();
    const draggable = isPlayableFromHand(card);
    const [{ isDragging }, dragRef] = useDrag({
        type: DRAG_CARD,
        item: { id: card.cardId },
        canDrag: draggable,
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });
    const setRef = (node: HTMLDivElement | null) => {
        dragRef(node);
    };
    const removalClass = removal?.cardId === card.cardId ? (removal.kind === 'stolen' ? 'hts-steal' : 'hts-destroy') : '';
    return (
        <div ref={setRef} className={`hand-card ${removalClass}`} style={{ ...style, opacity: isDragging ? 0.4 : 1, cursor: draggable ? 'grab' : 'pointer' }}>
            <GameCard card={card} width={124} onClick={onInspect} ariaLabel={t.board.seeDetails(card.cardName ?? t.common.card)} />
        </div>
    );
}

interface PlayerZoneProps {
    player: PlayerData | undefined;
    slainCount: number;
    tags: PlayerTag[];
    removal: CardRemoval | null;
    handRemoval: HandRemoval | null;
    canPlay: boolean;
    locallyUsed: number[];
    onPlay: (cardId: number) => void;
    onInspectLeader: () => void;
    onInspectCard: (card: CardData, source: 'hand' | 'party') => void;
}

function PlayerZone({ player, slainCount, tags, removal, handRemoval, canPlay, locallyUsed, onPlay, onInspectLeader, onInspectCard }: PlayerZoneProps) {
    const { t } = useI18n();
    const [{ isOver, canDrop }, dropRef] = useDrop({
        accept: DRAG_CARD,
        canDrop: () => canPlay,
        drop: (item: { id: number }) => onPlay(item.id),
        collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
    });
    const setDropRef = (node: HTMLDivElement | null) => {
        dropRef(node);
    };

    const info = classInfo(player?.leader);
    const classLabel = player?.leader ? t.classes[player.leader as HeroClassId]?.label : '';
    const heroes = player?.party || [];
    const hand = player?.hand || [];
    const have = partyClasses(player?.leader, player?.party);
    const count = hand.length;
    const spacing = count > 7 ? Math.max(46, 84 - (count - 7) * 6) : 84;

    return (
        <section className="zone" aria-label={t.board.zoneAria}>
            <div className="zone-leader">
                {info ? (
                    <button type="button" className="zone-leader-card" onClick={onInspectLeader} aria-label={t.board.leaderAria(info.leaderName)} style={{ boxShadow: `0 0 0 3px ${info.tint}, 0 14px 30px rgba(0,0,0,.55)` }}>
                        <img src={info.leaderArt} alt="" />
                    </button>
                ) : (
                    <div className="zone-leader-card zone-leader-card--empty">{t.board.noLeaderCard}</div>
                )}
                <span className="zone-leader-label" style={{ color: info?.tint }}>{info ? t.board.leaderLabel(classLabel) : ''}</span>
                <div className="zone-slain"><SlainSlots count={slainCount} width={40} /></div>
            </div>

            <div className="zone-party">
                <div className="zone-party-head">
                    <span className="hts-display" style={{ fontSize: 22 }}>{t.board.yourParty}</span>
                    <ClassPips have={have} size={20} />
                    <span className="hts-muted" style={{ fontSize: 13 }}>{t.board.partyStats(have.size, slainCount)}</span>
                    {tags.slice(-2).map((tag) => <span key={tag.key} className="plaque-tag">{tag.render(t)}</span>)}
                </div>
                <div ref={setDropRef} data-fx="my-party" className={`zone-party-row hts-scroll ${isOver && canDrop ? 'zone-party-row--drop' : ''}`}>
                    {heroes.map((card) => {
                        const used = player?.usedCardIds?.includes(card.cardId) || locallyUsed.includes(card.cardId);
                        const removalClass = removal?.cardId === card.cardId ? (removal.kind === 'steal' ? 'hts-steal' : 'hts-destroy') : 'hts-pop';
                        return (
                            <div key={card.cardId} className={`zone-hero ${removalClass}`}>
                                <GameCard card={card} width={108} dimmed={used} onClick={() => onInspectCard(card, 'party')} ariaLabel={`${card.cardName ?? t.cardTypes.HERO}${used ? t.board.usedSuffix : ''}`} />
                                {used && <span className="zone-hero-used">{t.board.used}</span>}
                            </div>
                        );
                    })}
                    <div className="zone-drop-hint">{canPlay ? t.board.dropHint : t.board.partyLabel}</div>
                </div>
            </div>

            <div className="hand" data-fx="hand" aria-label={t.board.handAria(count)}>
                {hand.map((card, i) => {
                    const off = i - (count - 1) / 2;
                    return (
                        <HandCard
                            key={card.cardId}
                            card={card}
                            removal={handRemoval}
                            onInspect={() => onInspectCard(card, 'hand')}
                            style={{
                                left: `calc(50% + ${off * spacing - 62}px)`,
                                top: 26 + Math.abs(off) * Math.abs(off) * 4,
                                transform: `rotate(${off * (count > 7 ? 3 : 4.5)}deg)`,
                                zIndex: 10 + i,
                            }}
                        />
                    );
                })}
                {count > 0 && <span className="hand-count">{t.board.inHand(count)}</span>}
            </div>
        </section>
    );
}

export default PlayerZone;
