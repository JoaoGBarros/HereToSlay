import { useI18n } from '@/i18n';
import { ApPips } from '../../common/Widgets';

interface ActionPanelProps {
    isMyTurn: boolean;
    turnName: string;
    currentAP: number;
    maxAP: number;
    phaseLabel: string;
    canDraw: boolean;
    onDraw: () => void;
    onOpenRules: () => void;
}

function ActionPanel({ isMyTurn, turnName, currentAP, maxAP, phaseLabel, canDraw, onDraw, onOpenRules }: ActionPanelProps) {
    const { t } = useI18n();
    return (
        <aside className={`actions ${isMyTurn ? 'actions--mine hts-glow' : ''}`} aria-label={t.actions.aria}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ lineHeight: 1.05, minWidth: 0 }}>
                    <div className="hts-label" style={{ color: isMyTurn ? 'var(--hts-gold-text)' : undefined }}>
                        {isMyTurn ? t.actions.yourTurn : t.actions.turnOf(turnName)}
                    </div>
                    <div className="hts-display" style={{ fontSize: 24 }}>{t.actions.apTitle}</div>
                </div>
                <ApPips current={isMyTurn ? currentAP : 0} max={maxAP || 3} />
            </div>
            <span className="actions-phase" role="status">{phaseLabel}</span>
            <button type="button" className="actions-row" disabled={!canDraw} onClick={onDraw}>
                {t.actions.draw} <span>{t.actions.costs[0].cost}</span>
            </button>
            <ul className="actions-costs">
                {t.actions.costs.map((c) => (
                    <li key={c.label}><span>{c.label}</span><span>{c.cost}</span></li>
                ))}
            </ul>
            <p className="actions-note">{t.actions.autoEnd}</p>
            <button type="button" className="hts-btn hts-btn--ghost hts-btn--sm" style={{ marginTop: 'auto' }} onClick={onOpenRules}>{t.actions.rules}</button>
        </aside>
    );
}

export default ActionPanel;
