import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { monsterRequirement, useI18n } from '@/i18n';
import { cardText, MONSTER_REWARD } from '@/utils/cardText';
import { cardTypeLabel, GameCard } from './GameCard';
import type { CardData, MonsterData } from './types';

export interface InspectorAction {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'ghost' | 'danger';
    disabled?: boolean;
}

interface CardInspectorProps {
    card?: CardData | null;
    monster?: MonsterData | null;
    image?: string;
    title?: string;
    kicker?: string;
    hint?: string;
    actions?: InspectorAction[];
    onClose: () => void;
}

/** What a card does, read from its own text: effect, the keywords it uses, and (for monsters) each roll range. */
function CardDetails({ card, monster }: { card?: CardData | null; monster?: MonsterData | null }) {
    const { t, lang } = useI18n();
    if (monster) {
        const reward = monster.reward ? MONSTER_REWARD[monster.reward] : undefined;
        return (
            <>
                <ul className="insp-topics">
                    <li><span className="insp-tag insp-tag--req">{t.engine.inspect.requirement}</span>{monsterRequirement(t, monster.partyRequirement)}</li>
                    <li><span className="insp-tag insp-tag--fail">{monster.fightBackThreshold}−</span>{t.engine.inspect.penalty[monster.penalty ?? ''] ?? ''}</li>
                    <li><span className="insp-tag insp-tag--win">{monster.slayThreshold}+</span>{t.engine.inspect.slayText}</li>
                </ul>
                {reward && (
                    <div className="insp-box">
                        <span className="hts-label">{t.engine.inspect.passive}</span>
                        <p>{reward[lang]}</p>
                    </div>
                )}
            </>
        );
    }
    const text = card ? cardText(card) : null;
    const itemText = card?.item ? cardText(card.item) : null;
    const keywords = [...new Set([...(text?.kw ?? []), ...(itemText?.kw ?? [])])];
    return (
        <>
            {card?.type === 'HERO' && card.diceValue ? (
                <span className="insp-tag insp-tag--win" style={{ alignSelf: 'flex-start' }}>{t.engine.inspect.effectRoll(card.diceValue)}</span>
            ) : null}
            {text && (
                <div className="insp-box insp-box--effect">
                    <span className="hts-label">{t.engine.inspect.effect}</span>
                    <p>{text[lang]}</p>
                </div>
            )}
            {card?.item && itemText && (
                <div className="insp-box">
                    <span className="hts-label">{t.engine.inspect.equipped(card.item.cardName ?? '')}</span>
                    <p>{itemText[lang]}</p>
                </div>
            )}
            {keywords.length > 0 && (
                <div className="hts-inspector-keys">
                    <span className="hts-label">{t.inspect.keywords}</span>
                    {keywords.map((k) => (
                        <span key={k}><b>{k}</b> — {t.engine.keywords[k]}</span>
                    ))}
                </div>
            )}
        </>
    );
}

/** Full-size, readable view of any card, with its effect, keywords and contextual actions. */
export function CardInspector({ card, monster, image, title, kicker, hint, actions = [], onClose }: CardInspectorProps) {
    const { t } = useI18n();
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const name = title || card?.cardName || monster?.name || t.common.card;

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
                    <CardDetails card={card} monster={monster} />
                    {hint && <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: 'var(--hts-muted)' }}>{hint}</p>}
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
