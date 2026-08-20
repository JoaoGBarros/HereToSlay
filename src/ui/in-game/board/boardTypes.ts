import type { Dict } from '@/i18n/pt';

/** Texts are rendered from the current dictionary, so they follow a language switch. */
export interface PlayerTag {
    key: string;
    render: (t: Dict) => string;
}

export type FeedTone = 'jade' | 'ember' | 'gold' | 'sky' | 'curse';

export interface FeedEvent {
    id: number;
    render: (t: Dict) => string;
    tone: FeedTone;
}

export interface CardRemoval {
    cardId: number;
    kind: 'destroy' | 'steal';
}

export interface HandRemoval {
    cardId: number;
    kind: 'stolen' | 'discarded';
}

export const TONE_COLOR: Record<FeedTone, string> = {
    jade: 'var(--hts-jade)',
    ember: 'var(--hts-ember)',
    gold: 'var(--hts-gold)',
    sky: 'var(--hts-sky)',
    curse: 'var(--hts-curse)',
};

export const DRAG_CARD = 'HAND_CARD';
