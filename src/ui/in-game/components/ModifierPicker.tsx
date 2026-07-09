import { useEffect, useState } from 'react';
import { getModifierArt } from '@/utils/CardArt';
import './css/ModifierPicker.css';

export interface ModifierWindowState {
    context: string;
    legalTargets: string[];
    durationMs: number;
}

function ModifierPicker({ window, hand, playersData, socket, id, onPlay }: {
    window: ModifierWindowState;
    hand: any[];
    playersData: Record<string, any>;
    socket: React.MutableRefObject<WebSocket | null> | null;
    id: string | undefined;
    onPlay: () => void;
}) {
    const modifierCards = hand.filter((card) => card.type === 'MODIFIER');
    const [secondsLeft, setSecondsLeft] = useState(Math.ceil(window.durationMs / 1000));

    useEffect(() => {
        setSecondsLeft(Math.ceil(window.durationMs / 1000));
        const interval = setInterval(() => {
            setSecondsLeft((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [window.durationMs, window.context]);

    const playModifier = (cardId: number, value: number, targetPlayerId: string) => {
        if (!socket || !socket.current) return;
        socket.current.send(JSON.stringify({
            type: 'match',
            subtype: 'action',
            action: 'play_modifier',
            id: id,
            payload: {
                card_id: cardId,
                chosen_value: value,
                target_player_id: targetPlayerId,
            }
        }));
        onPlay();
    };

    if (modifierCards.length === 0) return null;

    return (
        <div className="modifier-picker">
            <div className="modifier-picker-header">
                <span className="modifier-picker-icon">🔮</span>
                <div className="modifier-picker-header-text">
                    <span className="modifier-picker-title">Play a Modifier?</span>
                    <span className="modifier-picker-subtitle">Boost or weaken a roll in progress before it resolves</span>
                </div>
                <span className="modifier-picker-countdown">{secondsLeft}s</span>
            </div>
            <div className="modifier-picker-timer-track">
                <div
                    className="modifier-picker-timer-fill"
                    style={{ animationDuration: `${window.durationMs}ms` }}
                />
            </div>

            <div className="modifier-picker-cards">
                {modifierCards.map((card) => {
                    const art = getModifierArt(card.cardName);
                    return (
                        <div key={card.cardId} className="modifier-picker-card">
                            <div className="modifier-picker-card-header">
                                {art && <img src={art} alt={card.cardName} className="modifier-picker-card-art" />}
                                <div className="modifier-picker-card-name">{card.cardName}</div>
                            </div>
                            <div className="modifier-picker-targets">
                                {window.legalTargets.map((targetId) => (
                                    <div key={targetId} className="modifier-picker-target-group">
                                        <small>On {playersData[targetId]?.username || targetId}'s roll, apply:</small>
                                        <div className="modifier-picker-values">
                                            {(card.possibleValues || []).map((value: number) => (
                                                <button
                                                    key={value}
                                                    className={value > 0 ? "modifier-value-positive" : "modifier-value-negative"}
                                                    title={value > 0 ? `Add ${value} to the roll` : `Subtract ${Math.abs(value)} from the roll`}
                                                    onClick={() => playModifier(card.cardId, value, targetId)}
                                                >
                                                    {value > 0 ? `+${value}` : value}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ModifierPicker;
