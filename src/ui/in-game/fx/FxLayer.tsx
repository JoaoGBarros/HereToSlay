import { useLayoutEffect, useRef } from 'react';
import { getCardArt } from '@/utils/CardArt';
import { isReducedMotion } from '@/utils/motion';
import { uiZoom } from '@/utils/uiScale';
import deckBack from '../../assets/deck.png';
import type { FxEvent } from './fxDiff';
import './fx.css';

const CARD_W = 120;
const CARD_H = 168;
const PARTICLES = 12;

type Point = { x: number; y: number };

/** Screen rects are in window pixels; the fx layer lives inside the zoomed page (uiScale). */
function center(rect: DOMRect | null | undefined): Point | null {
    const zoom = uiZoom();
    return rect ? { x: (rect.left + rect.width / 2) / zoom, y: (rect.top + rect.height / 2) / zoom } : null;
}

function screenCenter(): Point {
    const zoom = uiZoom();
    return { x: window.innerWidth / zoom / 2, y: (window.innerHeight / zoom) * 0.42 };
}

/** Where a player's cards live on screen: your hand/party, or an opponent's plaque. */
function anchor(playerId: string | undefined, me: string, zone: 'hand' | 'party'): Point | null {
    if (!playerId) return null;
    if (playerId === me) {
        const selector = zone === 'hand' ? '[data-fx="hand"]' : '[data-fx="my-party"]';
        return center(document.querySelector(selector)?.getBoundingClientRect());
    }
    return center(document.querySelector(`[data-fx-player="${CSS.escape(playerId)}"]`)?.getBoundingClientRect());
}

function deckPoint(): Point {
    return center(document.querySelector('[data-fx="deck"]')?.getBoundingClientRect()) || { x: 100, y: window.innerHeight / uiZoom() / 2 };
}

function at(p: Point, scale = 1, rotate = 0, opacity = 1): Keyframe {
    return { transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`, opacity };
}

interface Plan {
    frames: Keyframe[];
    duration: number;
    delay?: number;
    easing?: string;
}

function plan(fx: FxEvent, me: string, index: number): Plan | null {
    const mid = screenCenter();
    switch (fx.kind) {
        case 'draw': {
            const to = anchor(fx.to, me, 'hand');
            if (!to) return null;
            const from = deckPoint();
            return { frames: [at(from, 0.7, 0, 0), at(from, 0.7, -6), at(to, 0.55, 8, 0.9), at(to, 0.4, 12, 0)], duration: 750, delay: index * 140, easing: 'cubic-bezier(.3,.7,.3,1)' };
        }
        case 'play': {
            const from = anchor(fx.from, me, 'hand') || mid;
            const to = anchor(fx.to, me, 'party') || mid;
            return {
                frames: [
                    { ...at(from, 0.6, -8, 0), offset: 0 },
                    { ...at(mid, 1.7, 0), offset: 0.3 },
                    { ...at(mid, 1.6, 0), offset: 0.7 },
                    { ...at(to, 0.45, 0, 0), offset: 1 },
                ],
                duration: 1600,
                easing: 'cubic-bezier(.2,.8,.2,1)',
            };
        }
        case 'cast': {
            const from = anchor(fx.from, me, 'hand') || mid;
            return {
                frames: [
                    { ...at(from, 0.6, -10, 0), offset: 0 },
                    { ...at(mid, 1.8, 0), offset: 0.3 },
                    { ...at(mid, 1.7, 0), offset: 0.72, filter: 'brightness(1)' },
                    { ...at({ x: mid.x, y: mid.y - 60 }, 2.1, 0, 0), offset: 1, filter: 'brightness(2.2) blur(8px)' },
                ],
                duration: 1700,
                easing: 'cubic-bezier(.2,.8,.2,1)',
            };
        }
        case 'destroy': {
            const from = anchor(fx.from, me, 'party') || mid;
            return {
                frames: [
                    { ...at(from, 0.9, 0), filter: 'none', offset: 0 },
                    { ...at(from, 1.05, -3), filter: 'brightness(1.7) sepia(1) saturate(4) hue-rotate(-25deg)', offset: 0.3 },
                    { ...at({ x: from.x, y: from.y + 30 }, 0.8, 8, 0.7), filter: 'brightness(.5) sepia(1) blur(1px)', offset: 0.7 },
                    { ...at({ x: from.x, y: from.y + 60 }, 0.6, 14, 0), filter: 'brightness(.2) blur(6px)', offset: 1 },
                ],
                duration: 1400,
                easing: 'ease-in',
            };
        }
        case 'steal': {
            const from = anchor(fx.from, me, 'party');
            const to = anchor(fx.to, me, 'party');
            if (!from || !to) return null;
            const lift = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 120 };
            return { frames: [at(from, 0.7, 0), at(lift, 1.1, -12), at(to, 0.55, 6, 0.2)], duration: 1200, easing: 'cubic-bezier(.4,.1,.3,1)' };
        }
        case 'transfer': {
            const from = anchor(fx.from, me, 'hand');
            const to = anchor(fx.to, me, 'hand');
            if (!from || !to) return null;
            return { frames: [at(from, 0.6, -10), at(to, 0.5, 10, 0.3)], duration: 900, easing: 'cubic-bezier(.3,.7,.3,1)' };
        }
        case 'discard': {
            const from = anchor(fx.from, me, 'hand') || mid;
            const to = deckPoint();
            return { frames: [at(from, 0.7, 0), at({ x: (from.x + to.x) / 2, y: from.y - 80 }, 0.8, -20), at(to, 0.5, -40, 0)], duration: 950, easing: 'ease-in-out' };
        }
        case 'modifier': {
            const from = anchor(fx.from, me, 'hand') || mid;
            const to = anchor(fx.to, me, 'party') || mid;
            return { frames: [at(from, 0.6, 0, 0), at(from, 1.3, 0), at(to, 1, 0, 0)], duration: 1100, easing: 'cubic-bezier(.3,.7,.3,1)' };
        }
        default:
            return null;
    }
}

function FxItem({ fx, me, index, reportsDone, onDone }: { fx: FxEvent; me: string; index: number; reportsDone: boolean; onDone: (id: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const el = ref.current;
        const p = plan(fx, me, index);
        const finish = () => { if (reportsDone) onDone(fx.id); };
        if (!el || !p || isReducedMotion()) {
            finish();
            return;
        }
        const animation = el.animate(p.frames, { duration: p.duration, delay: p.delay ?? 0, easing: p.easing ?? 'ease', fill: 'both' });
        animation.onfinish = finish;
        return () => animation.cancel();
    }, [fx, me, index, reportsDone, onDone]);

    if (fx.kind === 'modifier') {
        const value = fx.value ?? 0;
        return (
            <div ref={ref} className={`fx-item fx-mod ${value > 0 ? 'fx-mod--plus' : 'fx-mod--minus'}`}>
                {value > 0 ? `+${value}` : `−${Math.abs(value)}`}
            </div>
        );
    }

    const faceDown = fx.kind === 'draw' || fx.kind === 'transfer' || !fx.card;
    const art = faceDown ? deckBack : getCardArt(fx.card || {});
    return (
        <div ref={ref} className={`fx-item fx-card fx-card--${fx.kind}`} style={{ width: CARD_W, height: CARD_H }}>
            {art ? <img src={art} alt="" /> : <span className="fx-card-text">{fx.card?.cardName}</span>}
            {(fx.kind === 'cast' || fx.kind === 'play') && <span className="fx-ring" />}
            {(fx.kind === 'cast' || fx.kind === 'destroy') && (
                <span className="fx-particles">
                    {Array.from({ length: PARTICLES }).map((_, i) => (
                        <i key={i} style={{ transform: `rotate(${(360 / PARTICLES) * i}deg)` }} />
                    ))}
                </span>
            )}
        </div>
    );
}

interface FxLayerProps {
    events: FxEvent[];
    me: string;
    onDone: (id: number) => void;
}

/** Transient card animations drawn above the board (below scenes and dialogs). */
function FxLayer({ events, me, onDone }: FxLayerProps) {
    if (events.length === 0) return null;
    return (
        <div className="fx-layer" aria-hidden="true">
            {events.map((fx) => {
                const copies = fx.kind === 'draw' ? Math.max(1, fx.count ?? 1) : 1;
                return Array.from({ length: copies }).map((_, i) => (
                    <FxItem key={`${fx.id}-${i}`} fx={fx} me={me} index={i} reportsDone={i === copies - 1} onDone={onDone} />
                ));
            })}
        </div>
    );
}

export default FxLayer;
