const STORAGE_KEY = 'hts-motion';
const REDUCED_CLASS = 'hts-reduced-motion';

export type MotionPref = 'full' | 'reduced';

function systemPrefersReduced(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The player's animation setting; until they choose, it follows the operating system. */
export function getMotionPref(): MotionPref {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'full' || saved === 'reduced') return saved;
    } catch {
        // Storage unavailable: fall back to the system setting.
    }
    return systemPrefersReduced() ? 'reduced' : 'full';
}

export function isReducedMotion(): boolean {
    return getMotionPref() === 'reduced';
}

export function applyMotionPref(pref: MotionPref = getMotionPref()): void {
    document.documentElement.classList.toggle(REDUCED_CLASS, pref === 'reduced');
}

export function setMotionPref(pref: MotionPref): void {
    try {
        localStorage.setItem(STORAGE_KEY, pref);
    } catch {
        // Not persisted; still applied for this session.
    }
    applyMotionPref(pref);
}
