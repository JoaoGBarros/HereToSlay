import { useState } from 'react';
import ReactDOM from 'react-dom';
import { useI18n } from '@/i18n';

/** Leave the match at any moment, after a confirmation. The others keep playing. */
function SurrenderButton({ onSurrender, floating }: { onSurrender: () => void; floating?: boolean }) {
    const { t } = useI18n();
    const [asking, setAsking] = useState(false);
    return (
        <>
            <button
                type="button"
                className={`hts-icon-btn surrender-btn ${floating ? 'surrender-btn--floating' : ''}`}
                aria-label={t.engine.surrender.button}
                title={t.engine.surrender.button}
                onClick={() => setAsking(true)}
            >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 21V4" />
                    <path d="M5 4h11l-2 4 2 4H5" />
                </svg>
                {floating && t.engine.surrender.button}
            </button>
            {asking && ReactDOM.createPortal(
                <div className="hts-overlay" style={{ zIndex: 980 }} role="dialog" aria-modal="true" aria-labelledby="surrender-h" onClick={() => setAsking(false)}>
                    <div className="sheet hts-panel hts-rise" style={{ width: 'min(480px, calc(var(--app-w) - 48px))', display: 'flex', flexDirection: 'column', gap: 14 }} onClick={(e) => e.stopPropagation()}>
                        <h2 id="surrender-h" className="hts-display" style={{ fontSize: 36 }}>{t.engine.surrender.title}</h2>
                        <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--hts-text-2)' }}>{t.engine.surrender.body}</p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button type="button" className="hts-btn hts-btn--ghost" onClick={() => setAsking(false)}>{t.engine.surrender.cancel}</button>
                            <button type="button" className="hts-btn hts-btn--danger" onClick={() => { setAsking(false); onSurrender(); }}>{t.engine.surrender.confirm}</button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}

export default SurrenderButton;
