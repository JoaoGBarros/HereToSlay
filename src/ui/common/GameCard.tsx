import type { CSSProperties, ReactNode } from 'react';
import { getCardArt } from '@/utils/CardArt';
import { useI18n } from '@/i18n';
import type { Dict } from '@/i18n/pt';
import deckBack from '../assets/deck.png';
import type { CardData } from './types';
import './common.css';

export const CARD_RATIO = 432 / 308;

export function cardTypeLabel(t: Dict, type?: string): string {
    return (type && t.cardTypes[type]) || t.common.card;
}

interface GameCardProps {
    card?: CardData | null;
    width: number;
    faceDown?: boolean;
    selected?: boolean;
    selectable?: boolean;
    dimmed?: boolean;
    className?: string;
    style?: CSSProperties;
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    ariaLabel?: string;
    children?: ReactNode;
}

/**
 * One playing card at any size. Uses the printed art when we have it, otherwise a
 * parchment text card (Item cards have no art yet).
 */
export function GameCard({ card, width, faceDown, selected, selectable, dimmed, className = '', style, onClick, onContextMenu, ariaLabel, children }: GameCardProps) {
    const { t } = useI18n();
    const height = Math.round(width * CARD_RATIO);
    const art = faceDown ? deckBack : card ? getCardArt(card) : undefined;
    const classes = [
        'hts-card',
        selected ? 'hts-card--selected' : '',
        selectable ? 'hts-card--selectable' : '',
        dimmed ? 'hts-card--dimmed' : '',
        onClick ? 'hts-card--clickable' : '',
        className,
    ].join(' ');
    const label = ariaLabel || (faceDown ? t.common.faceDownCard : card?.cardName || t.common.card);

    const face = art ? (
        <img src={art} alt="" draggable={false} className="hts-card-art" />
    ) : (
        <div className={`hts-card-text ${card?.type === 'ITEM' ? 'hts-card-text--item' : ''}`} style={{ fontSize: Math.max(9, width * 0.075) }}>
            <span className="hts-card-text-name" style={{ fontSize: Math.max(11, width * 0.13) }}>{card?.cardName || '?'}</span>
            <span className="hts-card-text-type">{cardTypeLabel(t, card?.type)}</span>
        </div>
    );

    // An equipped Item hangs off the bottom of its Hero; tiny cards only get a colored corner.
    const item = !faceDown && card?.item ? (
        width < 70 ? (
            <span className={`hts-card-item-dot ${card.item.cursed ? 'hts-card-item-dot--cursed' : ''}`} title={card.item.cardName} />
        ) : (
            <span className={`hts-card-item ${card.item.cursed ? 'hts-card-item--cursed' : ''}`} style={{ fontSize: Math.max(10, width * 0.095) }} title={card.item.cardName}>
                {card.item.cardName}
            </span>
        )
    ) : null;

    const common = {
        className: classes,
        style: { width, height, ...style },
        onContextMenu,
    };

    if (onClick) {
        return (
            <button type="button" {...common} onClick={onClick} aria-label={label} aria-pressed={selectable ? !!selected : undefined}>
                {face}
                {item}
                {children}
            </button>
        );
    }
    return (
        <div {...common} role="img" aria-label={label}>
            {face}
            {item}
            {children}
        </div>
    );
}
