interface Window {
    /** Present only inside the Electron app (see src/electron/preload.cts). */
    electron?: {
        isDesktop: true;
        /** Node's process.platform: 'win32', 'darwin', 'linux'... */
        platform: string;
    };
}
