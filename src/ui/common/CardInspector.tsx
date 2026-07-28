import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useI18n } from '@/i18n';
import { cardTypeLabel, GameCard } from './GameCard';
import type { CardData } from './types';

export interface InspectorAction {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'ghost' | 'danger';
    disabled?: boolean;
}

interface CardInspectorProps {
    card?: CardData | null;
    image?: string;
    title?: string;
    kicker?: string;
    hint?: string;
    actions?: InspectorAction[];
    onClose: () => void;
}

/** Full-size, readable view of any card, with its keywords and contextual actions. */
export function CardInspector({ card, image, title, kicker, hint, actions = [], onClose }: CardInspectorProps) {
    const { t } = useI18n();
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const keys = (card?.type && t.inspect.keys[card.type]) || [];
    const name = title || card?.cardName || t.common.card;

    return ReactDOM.createPortal(
        <div className="hts-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={name}>
            <div className="hts-inspector" onClick={(e) => e.stopPropagation()}>
                {image ? (
                    <img src={image} alt={name} style={{ width: 330, borderRadius: 18, boxShadow: '0 30px 70px rgba(0,0,0,.7)' }} />
                ) : (
                    <GameCard card={card} width={380} style={{ boxShadow: '0 30px 70px rgba(0,0,0,.7)' }} />
                )}
                <div className="hts-inspector-body">
                    <span className="hts-chip hts-chip--gold" style={{ alignSelf: 'flex-start' }}>{kicker || cardTypeLabel(t, card?.type)}</span>
                    <h2 className="hts-display" style={{ fontSize: 46 }}>{name}</h2>
                    {card?.type === 'HERO' && card.diceValue ? (
                        <span className="hts-muted" style={{ fontSize: 16 }}>{t.inspect.requirement} <b style={{ color: 'var(--hts-text)' }}>{card.diceValue}+</b></span>
                    ) : null}
                    {hint && <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: 'var(--hts-text-2)' }}>{hint}</p>}
                    {keys.length > 0 && (
                        <div className="hts-inspector-keys">
                            <span className="hts-label">{t.inspect.keywords}</span>
                            {keys.map((k) => (
                                <span key={k.k}><b>{k.k}</b> — {k.d}</span>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {actions.map((a) => (
                            <button
                                key={a.label}
                                type="button"
                                className={`hts-btn ${a.variant === 'ghost' ? 'hts-btn--ghost' : ''} ${a.variant === 'danger' ? 'hts-btn--danger' : ''}`}
                                disabled={a.disabled}
                                onClick={a.onClick}
                            >
                                {a.label}
                            </button>
                        ))}
                        <button type="button" className="hts-btn hts-btn--ghost" onClick={onClose}>{t.common.close}</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
