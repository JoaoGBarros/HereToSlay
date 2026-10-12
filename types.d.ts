interface Window {
    /** Present only inside the Electron app (see src/electron/preload.cts). */
    electron?: {
        isDesktop: true;
    };
}
