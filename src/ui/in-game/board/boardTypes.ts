import type { Dict } from '@/i18n/pt';

/** Texts are rendered from the current dictionary, so they follow a language switch. */
export interface PlayerTag {
    key: string;
    tagType: string;
    render: (t: Dict) => string;
}

/** Each Kafka Streams highlight gets its own color, so badges read at a glance. */
export const TAG_STYLE: Record<string, { bg: string; fg: string; mark: string }> = {
    FIRST_BLOOD: { bg: '#e8693f', fg: '#1a0c06', mark: 'FB' },
    FREQUENT_BUYER: { bg: '#6fb4e8', fg: '#06131d', mark: '$' },
    RNG_DIFF: { bg: '#b77bd6', fg: '#13061b', mark: 'RNG' },
    COMBO: { bg: '#e9b949', fg: '#1a1206', mark: 'C' },
    GENEROUS_SOUL: { bg: '#5cc28a', fg: '#06180d', mark: '♥' },
    FOCUSED: { bg: '#d9474f', fg: '#1a0607', mark: '◎' },
    FOCUSING: { bg: '#d9474f', fg: '#1a0607', mark: '➶' },
    TURNING_POINT: { bg: '#e9b949', fg: '#1a1206', mark: 'TP' },
    CHAIN_REACTION: { bg: '#e8693f', fg: '#1a0c06', mark: '⚡' },
    FOCUSED_TARGET: { bg: '#d9474f', fg: '#1a0607', mark: '◎' },
};

export function tagStyle(tagType: string) {
    return TAG_STYLE[tagType] || { bg: '#e9b949', fg: '#1a1206', mark: '★' };
}

export const DRAG_CARD = 'HAND_CARD';
