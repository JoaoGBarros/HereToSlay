import { useLayoutEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { classInfo, partyClasses, type HeroClassId } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import { GameCard } from '../../common/GameCard';
import type { CardData, MonsterData, PlayerData } from '../../common/types';
import { ClassPips, PlayerTags, SlainMonsters } from './OpponentRail';
import { DRAG_CARD, type PlayerTag } from './boardTypes';

const PLAYABLE_TYPES = ['HERO', 'MAGIC', 'ITEM'];
const HAND_CARD_W = 124;
const MAX_SPACING = 96;

export function isPlayableFromHand(card: CardData): boolean {
    return PLAYABLE_TYPES.includes(card.type || '');
}

/** The hit box stays put; only the face inside lifts on hover, so the card never slides out from under the cursor. */
function HandCard({ card, style, onInspect }: { card: CardData; style: React.CSSProperties; onInspect: () => void }) {
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
    return (
        <div ref={setRef} className="hand-slot" style={{ ...style, opacity: isDragging ? 0.4 : 1, cursor: draggable ? 'grab' : 'pointer' }}>
            <div className="hand-face">
                <GameCard card={card} width={HAND_CARD_W} onClick={onInspect} ariaLabel={t.board.seeDetails(card.cardName ?? t.common.card)} />
            </div>
        </div>
    );
}

interface PlayerZoneProps {
    player: PlayerData | undefined;
    tags: PlayerTag[];
    canPlay: boolean;
    onPlay: (cardId: number) => void;
    onInspectLeader: () => void;
    onInspectCard: (card: CardData, source: 'hand' | 'party') => void;
    onInspectMonster: (monster: MonsterData) => void;
}

function PlayerZone({ player, tags, canPlay, onPlay, onInspectLeader, onInspectCard, onInspectMonster }: PlayerZoneProps) {
    const { t } = useI18n();
    const handRef = useRef<HTMLDivElement | null>(null);
    const [handWidth, setHandWidth] = useState(800);
    const [{ isOver, canDrop }, dropRef] = useDrop({
        accept: DRAG_CARD,
        canDrop: () => canPlay,
        drop: (item: { id: number }) => onPlay(item.id),
        collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
    });
    const setDropRef = (node: HTMLDivElement | null) => {
        dropRef(node);
    };

    useLayoutEffect(() => {
        const node = handRef.current;
        if (!node) return;
        const observer = new ResizeObserver(([entry]) => setHandWidth(entry.contentRect.width));
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const info = classInfo(player?.leader);
    const classLabel = player?.leader ? t.classes[player.leader as HeroClassId]?.label : '';
    const heroes = player?.party || [];
    const hand = player?.hand || [];
    const slain = player?.slain || [];
    const have = partyClasses(player?.leader, player?.party);
    const count = hand.length;
    // Fan the hand to fit the space it has, however many cards there are.
    const spacing = count > 1 ? Math.min(MAX_SPACING, (handWidth - HAND_CARD_W - 16) / (count - 1)) : 0;
    const tilt = count > 8 ? 2 : 4;

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
                <div className="zone-slain"><SlainMonsters slain={slain} width={46} vertical onInspect={onInspectMonster} /></div>
            </div>

            <div className="zone-main">
                <div className="zone-party-head">
                    <span className="hts-display" style={{ fontSize: 22 }}>{t.board.yourParty}</span>
                    <ClassPips have={have} size={20} />
                    <span className="hts-muted" style={{ fontSize: 13 }}>{t.board.partyStats(have.size, slain.length)}</span>
                    {player && <StatusChips player={player} />}
                    <PlayerTags tags={tags} />
                </div>
                <div ref={setDropRef} data-fx="my-party" className={`zone-party-row hts-scroll ${canPlay ? 'zone-party-row--armed' : ''} ${isOver && canDrop ? 'zone-party-row--drop' : ''}`}>
                    {heroes.map((card) => {
                        const used = player?.usedCardIds?.includes(card.cardId);
                        return (
                            <div key={card.cardId} className="zone-hero hts-pop">
                                <GameCard card={card} width={108} dimmed={used} onClick={() => onInspectCard(card, 'party')} ariaLabel={`${card.cardName ?? t.cardTypes.HERO}${used ? t.board.usedSuffix : ''}`} />
                                {used && <span className="zone-hero-used">{t.board.used}</span>}
                            </div>
                        );
                    })}
                    <div className="zone-drop-hint">{isOver && canDrop ? t.engine.board.dropParty : canPlay ? t.board.dropHint : t.board.partyLabel}</div>
                </div>

                <div ref={handRef} className="hand" data-fx="hand" aria-label={t.board.handAria(count)}>
                    {hand.map((card, i) => {
                        const off = i - (count - 1) / 2;
                        return (
                            <HandCard
                                key={card.cardId}
                                card={card}
                                onInspect={() => onInspectCard(card, 'hand')}
                                style={{
                                    left: `calc(50% + ${off * spacing - HAND_CARD_W / 2}px)`,
                                    top: 18 + Math.abs(off) * Math.abs(off) * (count > 8 ? 1.2 : 3),
                                    transform: `rotate(${off * tilt}deg)`,
                                    zIndex: 10 + i,
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export function StatusChips({ player }: { player: PlayerData }) {
    const { t } = useI18n();
    const chips: string[] = [];
    if (player.rollBonusUntilEndOfTurn) chips.push(t.engine.board.bonus(player.rollBonusUntilEndOfTurn));
    if (player.protectedFromSteal) chips.push(t.engine.board.protectedSteal);
    if (player.protectedFromDestroy) chips.push(t.engine.board.protectedDestroy);
    if (player.unchallengeable) chips.push(t.engine.board.unchallengeable);
    return (
        <>
            {chips.map((c) => <span key={c} className="hts-chip hts-chip--sky" style={{ fontSize: 12 }}>{c}</span>)}
        </>
    );
}

export default PlayerZone;
