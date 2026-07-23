import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import en from './en';
import es from './es';
import pt, { type Dict } from './pt';

export type Lang = 'pt' | 'en' | 'es';

export const LANGS: { id: Lang; short: string; name: string; html: string }[] = [
    { id: 'pt', short: 'PT', name: 'Português', html: 'pt-BR' },
    { id: 'en', short: 'EN', name: 'English', html: 'en' },
    { id: 'es', short: 'ES', name: 'Español', html: 'es' },
];

const DICTS: Record<Lang, Dict> = { pt, en, es };
const STORAGE_KEY = 'hts-lang';

/** Saved choice first, then the system language, then Portuguese. */
function initialLang(): Lang {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'pt' || saved === 'en' || saved === 'es') return saved;
    } catch {
        // Storage unavailable: fall through to the system language.
    }
    const system = (navigator.language || '').toLowerCase();
    if (system.startsWith('es')) return 'es';
    if (system.startsWith('en')) return 'en';
    return 'pt';
}

interface I18nValue {
    lang: Lang;
    t: Dict;
    setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nValue>({ lang: 'pt', t: pt, setLang: () => undefined });

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(initialLang);

    useEffect(() => {
        document.documentElement.lang = LANGS.find((l) => l.id === lang)?.html ?? 'pt-BR';
    }, [lang]);

    const setLang = useCallback((next: Lang) => {
        setLangState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Not persisted; still applied for this session.
        }
    }, []);

    const value = useMemo(() => ({ lang, t: DICTS[lang], setLang }), [lang, setLang]);
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
    return useContext(I18nContext);
}

/** Segmented PT / EN / ES switch. */
export function LanguageSwitch() {
    const { lang, setLang, t } = useI18n();
    return (
        <div className="lang-switch" role="radiogroup" aria-label={t.common.language}>
            {LANGS.map((l) => (
                <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={lang === l.id}
                    title={l.name}
                    lang={l.html}
                    className={lang === l.id ? 'lang-switch-opt lang-switch-opt--on' : 'lang-switch-opt'}
                    onClick={() => setLang(l.id)}
                >
                    {l.short}
                </button>
            ))}
        </div>
    );
}

/** Monster requirements come from the engine in English ("Any 2 heroes", "Fighter + 1 any"). */
export function monsterRequirement(t: Dict, description?: string): string {
    if (!description) return t.monsterReq.none;
    const any = /^Any (\d+) heroe?s?$/i.exec(description.trim());
    if (any) return t.monsterReq.anyHeroes(Number(any[1]));
    const classPlus = /^(Bard|Fighter|Guardian|Ranger|Thief|Wizard) \+ (\d+) any$/i.exec(description.trim());
    if (classPlus) {
        const id = classPlus[1].toUpperCase() as keyof Dict['classes'];
        return t.monsterReq.classPlus(t.classes[id].label, Number(classPlus[2]));
    }
    return description;
}
