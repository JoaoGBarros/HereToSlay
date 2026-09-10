import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import ReactDOM from 'react-dom';

export const STAGE_W = 1440;
export const STAGE_H = 900;

function fit(): number {
    return Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
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
    const [scale, setScale] = useState(fit);
    useEffect(() => {
        const onResize = () => setScale(fit());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return ReactDOM.createPortal(
        <div className={`stage-backdrop ${className}`} style={{ background }} role="dialog" aria-modal="true" aria-label={label}>
            <div className="stage" style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})`, ...style }}>
                {children}
            </div>
        </div>,
        document.body,
    );
}
