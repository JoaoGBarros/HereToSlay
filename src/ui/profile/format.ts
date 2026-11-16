import type { Platform } from '@/auth/platform';
import type { Lang } from '@/i18n';

const LOCALES: Record<Lang, string> = { pt: 'pt-BR', en: 'en', es: 'es' };

const PLATFORM_LABELS: Record<Platform, string> = {
    WEB: 'Web',
    WINDOWS: 'Windows',
    MACOS: 'macOS',
    LINUX: 'Linux',
};

export function platformLabel(platform: Platform): string {
    return PLATFORM_LABELS[platform] ?? platform;
}

export function formatDate(iso: string, lang: Lang): string {
    return new Intl.DateTimeFormat(LOCALES[lang], { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function formatDateTime(iso: string, lang: Lang): string {
    return new Intl.DateTimeFormat(LOCALES[lang], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** Win rate as a whole percentage, or null before the first match. */
export function winRate(wins: number, played: number): number | null {
    if (played <= 0) return null;
    return Math.round((wins / played) * 100);
}
