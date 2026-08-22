import { useState } from 'react';
import { useI18n } from '@/i18n';
import type { PlayersMap } from '../../common/types';
import './css/ActionHistoryPanel.css';

export interface ActionHistoryEntry {
    playerId: string;
    action: string;
    timestamp: number;
}

const ROLL_ACTIONS = ['process_hero_roll', 'process_challenge_roll', 'process_monster_roll', 'order_selection', 'play_modifier'];

type Tab = 'all' | 'rolls';

function ActionHistoryPanel({ history, playersData, onClose }: {
    history: ActionHistoryEntry[];
    playersData: PlayersMap;
    onClose: () => void;
}) {
    const { t } = useI18n();
    const [tab, setTab] = useState<Tab>('all');
    const entries = [...history].reverse().filter((e) => tab === 'all' || ROLL_ACTIONS.includes(e.action));

    return (
        <aside className="history hts-fade" aria-label={t.history.aria}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 className="hts-display" style={{ fontSize: 30 }}>{t.history.title}</h2>
                <button type="button" className="hts-icon-btn" aria-label={t.history.close} onClick={onClose}>✕</button>
            </div>
            <div role="tablist" className="history-tabs">
                {(['all', 'rolls'] as Tab[]).map((id) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'history-tab history-tab--on' : 'history-tab'} onClick={() => setTab(id)}>
                        {id === 'all' ? t.history.all : t.history.rolls}
                    </button>
                ))}
            </div>
            <ol className="history-list hts-scroll">
                {entries.length === 0 && <li className="hts-muted">{t.history.empty}</li>}
                {entries.map((entry, idx) => (
                    <li key={`${entry.timestamp}-${idx}`} className="history-item">
                        <time className="history-time">{new Date(entry.timestamp).toLocaleTimeString(t.history.locale, { hour: '2-digit', minute: '2-digit' })}</time>
                        <span><b>{playersData[entry.playerId]?.username || t.common.someone}</b> {t.history.actions[entry.action] || entry.action}</span>
                    </li>
                ))}
            </ol>
        </aside>
    );
}

export default ActionHistoryPanel;
