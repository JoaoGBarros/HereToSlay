import HandCards from "@/ui/games/common/cards/handCards/HandCards";
import { useEffect, useState } from "react";

interface HandComponentProps {
    currentPlayerData: any;
    currentPlayerIdx: string;
    loggedUserId: string;
    socket: any;
    matchState?: string;
    isPlayerTurn?: boolean;
    id?: string;
    selectedCards?: number[];
    setMaxSelectableCards: (num: number) => void;
    setSelectedCards: (cards: number[]) => void;
}

function HandComponent({ currentPlayerData, currentPlayerIdx, loggedUserId, socket, matchState, isPlayerTurn, id,
    selectedCards, setMaxSelectableCards, setSelectedCards }: HandComponentProps) {
    const [selectedCardsState, setSelectedCardsState] = useState<number[]>(selectedCards || []);

    useEffect(() => {
        if (!socket || !socket.current) return;

        if (matchState === "SELECTING_HAND_CARDS") {
            socket.current.send(JSON.stringify({
                type: 'match',
                subtype: 'get_selected_targets',
                id: id,
            }));
        }
    }, [socket, id, matchState]);

    useEffect(() => {
        if (matchState !== "SELECTING_HAND_CARDS") setSelectedCardsState([]);
        else setSelectedCardsState(selectedCards || []);
    }, [selectedCards, matchState]);


    useEffect(() => {
        if (!socket || !socket.current) return;
        if (matchState !== "SELECTING_HAND_CARDS") return;

        const ws = socket.current;
        const handleMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.type === 'match' && data.subtype === 'select_hand_target') {
                const target = data.payload.target;
                const cardIds = target ? Object.values(target).flat().map(Number) : [];
                setSelectedCards(cardIds);
                setMaxSelectableCards(data.payload.maxTargets || 0);
            }
        };
        ws.addEventListener("message", handleMessage);
        return () => ws.removeEventListener("message", handleMessage);
    }, [socket, matchState]);


    function handleSelectHandTarget(cardId: number) {
        if (socket && socket.current && matchState === "SELECTING_HAND_CARDS" && isPlayerTurn && currentPlayerIdx !== loggedUserId) {
            socket.current.send(JSON.stringify({
                type: 'match',
                subtype: 'action',
                action: 'select_effect_target',
                id: id,
                payload: {
                    card_id: cardId,
                    player_id: currentPlayerIdx,
                }
            }));
        }
    }

    function handleDeselectHandTarget(cardId: number) {
        if (socket && socket.current && matchState === "SELECTING_HAND_CARDS" && isPlayerTurn && currentPlayerIdx !== loggedUserId) {
            socket.current.send(JSON.stringify({
                type: 'match',
                subtype: 'action',
                action: 'deselect_effect_target',
                id: id,
                payload: {
                    card_id: cardId,
                    player_id: currentPlayerIdx,
                }
            }));
        }
    }



    return (
        <div className='hand-cards'>
            {currentPlayerData && currentPlayerData.hand ? (
                currentPlayerData.hand.map((card: any, idx: any) => {
                    const total = currentPlayerData.hand.length;
                    const spread = 15;
                    const start = -spread / 2;
                    const angle = start + (spread / (total - 1 || 1)) * idx;
                    const scale = total > 13 ? Math.max(0.4, 1 - 0.05 * (total - 13)) : 1;
                    const baseSpacing = 150;
                    const spacing = total > 7 ? baseSpacing * Math.max(0.4, 1 - 0.04 * (total - 7)) : baseSpacing;
                    const isSelectable = matchState === "SELECTING_HAND_CARDS" && isPlayerTurn && currentPlayerIdx !== loggedUserId;
                    return (
                        <div
                            draggable
                            id={idx.toString()}
                            key={card.cardId + "-" + idx}
                            style={{
                                position: "absolute",
                                left: `calc(50% - 120px)`,
                                bottom: "0",
                                transform: `translateX(${(idx - total / 2) * spacing}px) rotate(${angle}deg) scale(${scale})`,
                                zIndex: idx,
                                transition: "transform 0.2s",
                            }}
                        >
                            <HandCards card={{ id: card.cardId }} isUserCard={currentPlayerIdx === loggedUserId} isSelectable={isSelectable!}
                                isSelected={selectedCardsState.includes(card.cardId)} onSelect={() => handleSelectHandTarget(card.cardId)} onDeselect={() => handleDeselectHandTarget(card.cardId)} />
                        </div>
                    );
                })
            ) : (
                <button
                    className="bg-yellow-400 text-brown-800 px-6 py-3 rounded font-bold shadow"
                    style={{
                        position: "absolute",
                        left: "50%",
                        bottom: "30px",
                        transform: "translateX(-50%)",
                        zIndex: 20,
                    }}
                >
                    Mostrar minhas cartas
                </button>
            )}
        </div>
    );
}

export default HandComponent;