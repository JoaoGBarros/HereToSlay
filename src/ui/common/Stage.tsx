import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { uiZoom } from '@/utils/uiScale';

export const STAGE_W = 1440;
export const STAGE_H = 900;

/** A column kept beside every full-screen scene (the match chat), so talking never stops. */
export interface StageSideValue {
    width: number;
    node: ReactNode;
}

export const StageSide = createContext<StageSideValue | null>(null);

function fit(sideWidth: number): number {
    // The page is already zoomed to fit small windows (uiScale), so measure in zoomed pixels.
    const zoom = uiZoom();
    return Math.min((window.innerWidth / zoom - sideWidth) / STAGE_W, window.innerHeight / zoom / STAGE_H);
}

/**
 * Full-screen scenes are laid out on the same 1440×900 canvas as the design artifact
 * and scaled to the window, so positions and sizes match the design exactly.
 */
export function Stage({ children, background = '#0d1315', label, className = '', style }: {
    children: ReactNode;
    background?: string;
    label: string;
    className?: string;
    style?: CSSProperties;
}) {
    const side = useContext(StageSide);
    const sideWidth = side?.width ?? 0;
    const [scale, setScale] = useState(() => fit(sideWidth));
    useEffect(() => {
        const onResize = () => setScale(fit(sideWidth));
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [sideWidth]);
    return ReactDOM.createPortal(
        <div className={`stage-backdrop ${className}`} style={{ background }} role="dialog" aria-modal="true" aria-label={label}>
            <div
                className="stage"
                style={{ width: STAGE_W, height: STAGE_H, left: `calc((100% - ${sideWidth}px) / 2)`, transform: `translate(-50%, -50%) scale(${scale})`, ...style }}
            >
                {children}
            </div>
            {side && <div className="stage-side" style={{ width: sideWidth }}>{side.node}</div>}
        </div>,
        document.body,
    );
}
