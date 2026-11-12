export type Platform = 'WEB' | 'WINDOWS' | 'MACOS' | 'LINUX';

const DESKTOP_PLATFORMS: Record<string, Platform> = {
    win32: 'WINDOWS',
    darwin: 'MACOS',
    linux: 'LINUX',
};

/** Where the client runs: the desktop app reports its OS, anything else is the web client. */
export function currentPlatform(): Platform {
    const desktop = window.electron;
    if (!desktop) return 'WEB';
    return DESKTOP_PLATFORMS[desktop.platform] ?? 'WEB';
}

export function isDesktopApp(): boolean {
    return Boolean(window.electron?.isDesktop);
}
