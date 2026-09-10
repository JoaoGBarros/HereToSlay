import { useI18n } from '@/i18n';
import { ApPips } from '../../common/Widgets';

interface ActionPanelProps {
    isMyTurn: boolean;
    turnName: string;
    currentAP: number;
    maxAP: number;
    idle: boolean;
    canThiefSkill: boolean;
    onDraw: () => void;
    onRedraw: () => void;
    onLeaderSkill: () => void;
    onEndTurn: () => void;
}

const DRAW_COST = 1;
const ATTACK_COST = 2;
const REDRAW_COST = 3;
const SKILL_COST = 1;

function ActionPanel({ isMyTurn, turnName, currentAP, maxAP, idle, canThiefSkill, onDraw, onRedraw, onLeaderSkill, onEndTurn }: ActionPanelProps) {
    const { t } = useI18n();
    const ready = isMyTurn && idle;
    const row = (label: string, cost: number, onClick: (() => void) | null, note?: string) => (
        <button type="button" className="actions-row" disabled={!onClick || !ready || currentAP < cost} onClick={onClick ?? undefined}>
            <span className="actions-row-label">{label}{note && <small>{note}</small>}</span>
            <span>{cost} PA</span>
        </button>
    );
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
            <span className="actions-phase" role="status">{!isMyTurn ? t.engine.actions.wait : idle ? t.phase.gameplayMine(currentAP, maxAP) : t.engine.actions.busy}</span>
            {row(t.engine.actions.draw, DRAW_COST, onDraw)}
            {row(t.engine.actions.attack, ATTACK_COST, null, t.engine.actions.attackHint)}
            {row(t.engine.actions.redraw, REDRAW_COST, onRedraw)}
            {canThiefSkill && row(t.engine.actions.leaderSkill, SKILL_COST, onLeaderSkill)}
            <button type="button" className="actions-end" disabled={!ready} onClick={onEndTurn}>{t.engine.actions.endTurn}</button>
        </aside>
    );
}

export default ActionPanel;
