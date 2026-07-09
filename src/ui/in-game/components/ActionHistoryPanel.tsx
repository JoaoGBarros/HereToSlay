import { useState } from 'react';
import './css/ActionHistoryPanel.css';

export interface ActionHistoryEntry {
    playerId: string;
    action: string;
    timestamp: number;
}

const ACTION_LABELS: Record<string, string> = {
    draw_card: 'drew a card',
    play_card: 'played a card',
    use_card: 'used a card',
    process_hero_roll: 'rolled for a Hero',
    process_challenge_roll: 'rolled in a duel',
    process_monster_roll: 'rolled against a monster',
    challenge: 'challenged the play',
    play_modifier: 'played a Modifier',
    order_selection: 'rolled for turn order',
    choose_party_leader: 'chose a Party Leader',
    select_effect_target: 'chose an effect target',
    deselect_effect_target: 'deselected an effect target',
    select_effect_player: 'chose a target player',
    deselect_effect_player: 'deselected a target player',
    apply_card_effects: 'resolved a card effect',
    attempt_slay_monster: 'attacked a monster',
};

function ActionHistoryPanel({ history, playersData }: {
    history: ActionHistoryEntry[];
    playersData: Record<string, any>;
}) {
    const [collapsed, setCollapsed] = useState(true);

    return (
        <div className={`action-history-panel ${collapsed ? 'action-history-collapsed' : ''}`}>
            <button className="action-history-toggle" onClick={() => setCollapsed((c) => !c)}>
                📜 History {collapsed ? '' : '▾'}
            </button>
            {!collapsed && (
                <div className="action-history-list">
                    {history.length === 0 && <div className="action-history-empty">No actions yet</div>}
                    {[...history].reverse().map((entry, idx) => (
                        <div className="action-history-entry" key={`${entry.timestamp}-${idx}`}>
                            <span className="action-history-player">{playersData[entry.playerId]?.username || 'Someone'}</span>
                            <span className="action-history-text">{ACTION_LABELS[entry.action] || entry.action}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ActionHistoryPanel;
