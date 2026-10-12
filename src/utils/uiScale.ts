/**
 * Every screen is designed for at least 1440×900. On smaller windows (laptops) the whole
 * interface is zoomed out to fit, so layouts keep the design instead of squeezing.
 *
 * Inside a CSS zoom, viewport units shrink too, so stylesheets use --app-w / --app-h
 * (the window size in zoomed pixels) instead of 100vw / 100vh.
 */
const BASE_W = 1440;
const BASE_H = 900;
const MIN_ZOOM = 0.6;

let current = 1;

/** The zoom applied to the page; divide screen coordinates by it to get CSS pixels. */
export function uiZoom(): number {
    return current;
}

function apply() {
    const zoom = Math.max(MIN_ZOOM, Math.min(1, window.innerWidth / BASE_W, window.innerHeight / BASE_H));
    current = Math.round(zoom * 1000) / 1000;
    const root = document.documentElement;
    root.style.setProperty('--ui-zoom', String(current));
    root.style.zoom = String(current);
}

export function installUiScale() {
    apply();
    window.addEventListener('resize', apply);
}
