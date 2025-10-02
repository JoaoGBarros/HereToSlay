import { Card } from "@heroui/card";
import './css/GameHeader.css';
import { useEffect, useState, useRef } from "react";
import { playSound } from "@/utils/SoundManager/SoundManager";
import { classAvatars } from "@/utils/ClassImages";

interface GameHeaderProps {
    playersData: { [id: string]: any };
    turn: string | null;
    loggedUserId: string;
    currentPlayerIdx: string;
    partyLeaderSelection: boolean;
    isPlayerTurn: boolean;
    diceRolled: boolean;
    socket: any;
    id: string | undefined;
    setCurrentPlayerIdx: (id: string) => void;
    setCurrentPlayerData: (data: any) => void;
    deckImg: string;
    autoSwitchView: boolean;
    setAutoSwitchView: (v: boolean) => void;
    matchState?: string;
    maxSelectableCards?: number;
    selectedCardsCount?: number;
    selectedPlayerId?: string | null;

}



function GameHeader({ playersData, partyLeaderSelection, isPlayerTurn, diceRolled, socket, id, turn,
    currentPlayerIdx, deckImg, loggedUserId, setCurrentPlayerIdx, setCurrentPlayerData, autoSwitchView,
    setAutoSwitchView, matchState, maxSelectableCards, selectedCardsCount, selectedPlayerId}: GameHeaderProps) {

    const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const playerIds = Object.keys(playersData);

    const deck = [
        { id: 1, name: "Carta 1" },
        { id: 2, name: "Carta 2" },
        { id: 3, name: "Carta 3" },
        { id: 4, name: "Carta 4" },
        { id: 5, name: "Carta 5" },
    ];

    const discard = [
        { id: 6, name: "Carta 6" },
        { id: 7, name: "Carta 7" },
    ];

    function handleDeckClick() {
        if (isPlayerTurn && diceRolled && !partyLeaderSelection) {
            playSound('cardDraw');
            if (socket && socket.current) {
                socket.current.send(JSON.stringify({
                    type: 'match',
                    subtype: 'action',
                    action: 'draw_card',
                    id: id
                }));
            }
        }

    }

    function onConfirmSelection() {
        if (!socket?.current) return;

        socket.current.send(JSON.stringify({
            type: 'match',
            subtype: 'action',
            action: 'apply_card_effects',
            id: id
        }));
    }
    

    useEffect(() => {
        if (!socket?.current) return;

        const handleMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);

            if (data.type === 'sound' && data.subtype === 'play_draw_card_sound') {
                if (currentPlayerIdx === turn) {
                    setIsDrawing(true);
                    playSound('cardDraw');
                }
            }
        };

        const ws = socket.current;
        ws.addEventListener('message', handleMessage);

        return () => {
            ws.removeEventListener('message', handleMessage);
        };
    }, [socket, currentPlayerIdx, turn]);

    function handlePlayerChange(_player: any, id: string) {
        setCurrentPlayerIdx(id);
    }

    function handleView(playerId: string) {
        setCurrentPlayerIdx(playerId);
        setMenuOpen(null);
    }

    function handleSelect(playerId: string) {

        if(playerId === loggedUserId) return;
        if (socket?.current) {

            let message = "";

            if(selectedPlayerId === playerId) {
                message = JSON.stringify({
                    type: 'match',
                    subtype: 'action',
                    action: 'deselect_effect_player',
                    targetPlayerId: playerId,
                    id: id
                });
            }else{
                message = JSON.stringify({
                    type: 'match',
                    subtype: 'action',
                    action: 'select_effect_player',
                    targetPlayerId: playerId,
                    id: id
                });
            }
            
            socket.current.send(message);
        }
        setMenuOpen(null);
    }

    function handlePlayerSwitcherWheel(e: React.WheelEvent<HTMLDivElement>) {
        e.preventDefault();
        if (playerIds.length <= 1) return;
        const currentIdx = playerIds.indexOf(currentPlayerIdx);
        let nextIdx;
        if (e.deltaY > 0) {
            nextIdx = (currentIdx + 1) % playerIds.length;
        } else {
            nextIdx = (currentIdx - 1 + playerIds.length) % playerIds.length;
        }
        setCurrentPlayerIdx(playerIds[nextIdx]);
    }

    function openMenu(playerId: string) {
        setMenuOpen(menuOpen === playerId ? null : playerId);
    }

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(null);
            }
        }

        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen]);

    return (
        <>
            {isDrawing && (
                <div className="draw-card-animation" onAnimationEnd={() => setIsDrawing(false)}>
                    <div
                        className="animated-card"
                        style={{
                            backgroundImage: `url(${deckImg})`,
                        }}
                    />
                </div>
            )}
            <div className="deck-discard-row flex flex-row gap-8 mb-5 justify-around items-center">
                <div
                    className={`deck-area deck-stack relative w-32 h-44`}
                    onClick={handleDeckClick}
                    aria-disabled={!isPlayerTurn}
                >
                    {matchState === "SELECTING_CARDS" || matchState === "SELECTING_HAND_CARDS" || matchState === "SELECTING_PLAYER" ? (
                        <div className={`selection-counter w-[90%] h-[50%] mt-[5vh] flex flex-col items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-yellow-500 text-white p-2 enter ${matchState === "SELECTING_CARDS" ? "enter" : "exit-left"
                            }`}>
                            <div className="text-2xl mt-2">
                                <span>{selectedCardsCount ? maxSelectableCards : selectedPlayerId ? 1 : 0}</span>
                                <span className="text-base"> / {maxSelectableCards ?? '...'}</span>
                            </div>
                        </div>
                    ) : (
                        <div className={`${matchState === "SELECTING_CARDS"  ? "exit-left" : "enter"
                            }`}>

                            {deck.map((card, idx) => (
                                <Card
                                    key={card.id}
                                    className="deck-card absolute w-24 h-36 flex items-center justify-center bg-white shadow"
                                    style={{
                                        left: `${idx * 2}px`,
                                        top: `${idx * 3}px`,
                                        zIndex: deck.length - idx,
                                        transform: `rotate(90deg) translateY(-30px) translateX(30px)`,
                                        backgroundImage: `url(${deckImg})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className='player-turn-indicator text-center flex flex-row justify-center items-center gap-2'>
                    {turn && turn.length > 0 && (
                        <>
                            <span className='font-bold' style={{ color: '#b48a5a' }}>Turno do jogador:</span>
                            <br />
                            <strong style={{ color: 'white' }}>{playersData[turn]?.username}</strong>
                        </>
                    )}
                </div>
                <div className="player-switcher flex gap-4 mb-6 items-center" onWheel={handlePlayerSwitcherWheel} tabIndex={0}>
                    {Object.entries(playersData).map(([id, player]: [string, any]) => {
                        const isTurn = turn?.toString() === id;
                        const isLogged = loggedUserId?.toString() === id;
                        let boxShadow = "";
                        if (isLogged) boxShadow += "0 0 0 4px #e2b007,";
                        if (currentPlayerIdx === id && currentPlayerIdx != loggedUserId) boxShadow += `0 0 0 4px #ff00d4ff,`;
                        if (isTurn) boxShadow += "0 0 0 8px #4fc3f7,";
                        if (
                            (matchState === "SELECTING_CARDS" || matchState === "SELECTING_HAND_CARDS" || matchState === "SELECTING_PLAYER") &&
                            turn?.toString() === loggedUserId?.toString() &&
                            id !== loggedUserId?.toString()
                        ) {
                            boxShadow += "0 0 0 6px #e53935,";
                        }

                        if(id === selectedPlayerId) {
                            boxShadow += "0 0 0 10px #43a047,";
                        }
                        if (boxShadow.endsWith(",")) boxShadow = boxShadow.slice(0, -1);

                        return (
                            <button
                                key={id}
                                disabled={partyLeaderSelection || (!diceRolled && isPlayerTurn && (matchState !== "SELECTING_CARDS" && matchState !== "SELECTING_HAND_CARDS" && matchState !== "SELECTING_PLAYER"))}
                                onMouseEnter={() => setHoveredPlayerId(id)}
                                onMouseLeave={() => setHoveredPlayerId(null)}
                                onClick={() => matchState === "SELECTING_PLAYER" && turn != loggedUserId ? handlePlayerChange(player, id) : openMenu(id)}
                                style={{
                                    padding: 0,
                                    borderRadius: "50%",
                                    border: "1px solid #ccc",
                                    background: "#fff",
                                    cursor: "pointer",
                                    width: "60px",
                                    height: "60px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                    boxShadow: boxShadow || undefined,
                                    transition: "box-shadow 0.2s"
                                }}
                            >
                                <img
                                    src={classAvatars[player.leader]}
                                    alt={player.username}
                                    style={{
                                        width: "56px",
                                        height: "56px",
                                        borderRadius: "50%",
                                        objectFit: "cover"
                                    }}
                                />
                                {hoveredPlayerId === id && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "100%",
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            marginBottom: "8px",
                                            background: "#fffbe6",
                                            color: "#b48a5a",
                                            border: "1px solid #e2b007",
                                            borderRadius: "8px",
                                            padding: "6px 16px",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                                            fontWeight: "bold",
                                            fontSize: "16px",
                                            whiteSpace: "nowrap",
                                            zIndex: 100,
                                        }}
                                    >
                                        {player.username}
                                    </div>
                                )}
                                {menuOpen === id && (
                                    <div
                                        ref={menuRef}
                                        style={{
                                            position: "absolute",
                                            top: "100%",
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            marginTop: "8px",
                                            background: "#fff",
                                            border: "1px solid #b48a5a",
                                            borderRadius: "8px",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                                            padding: "8px 0",
                                            zIndex: 100,
                                            minWidth: "120px"
                                        }}
                                    >
                                        <button
                                            style={{
                                                display: "block",
                                                width: "100%",
                                                background: "none",
                                                border: "none",
                                                padding: "8px 16px",
                                                textAlign: "left",
                                                cursor: "pointer",
                                                fontSize: "16px",
                                                color: "#333"
                                            }}
                                            onClick={() => handleView(id)}
                                        >
                                            Visualizar
                                        </button>
                                        <hr style={{ margin: "4px 0", border: "none", borderTop: "1px solid #e0e0e0" }} />
                                        {matchState === "SELECTING_PLAYER" && id !== loggedUserId ? (
                                            <button
                                                style={{
                                                    display: "block",
                                                    width: "100%",
                                                    background: "none",
                                                    border: "none",
                                                    padding: "8px 16px",
                                                    textAlign: "left",
                                                    cursor: "pointer",
                                                    fontSize: "16px",
                                                    color: "#333"
                                                }}
                                                onClick={() => handleSelect(id)}
                                            >
                                                {id == selectedPlayerId ? "Remover Seleção" : "Selecionar"}
                                            </button>
                                        ) : null}
                                    </div>
                                )}
                            </button>
                            
                        );
                    })}
                    <button
                        onClick={() => setAutoSwitchView(!autoSwitchView)}
                        style={{
                            marginLeft: 12,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 28,
                            color: autoSwitchView ? '#4fc3f7' : '#b48a5a'
                        }}
                        title={autoSwitchView ? "Troca automática ativada" : "Troca automática desativada"}
                    >
                        {autoSwitchView ? '▶️' : '⏸️'}
                    </button>

                </div>
                <div
                    className={`discard-area deck-stack relative w-32 h-44 `}
                >
                    {matchState === "SELECTING_CARDS" || matchState === "SELECTING_HAND_CARDS" || matchState === "SELECTING_PLAYER" || matchState === "SELECTING_PLAYER" ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <button
                                onClick={onConfirmSelection}
                                disabled={!isPlayerTurn || (selectedCardsCount! == 0 && matchState !== "SELECTING_PLAYER") || (!selectedPlayerId && matchState === "SELECTING_PLAYER")}
                                className={`selection-confirm px-4 py-2 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors ${matchState === "SELECTING_CARDS" || matchState === "SELECTING_HAND_CARDS" || matchState === "SELECTING_PLAYER" ? "enter" : "exit-right"
                                    }`}
                            >
                                Concluir Ação
                            </button>
                        </div>
                    ) : (
                        <div className={`${matchState === "SELECTING_CARDS" || matchState === "SELECTING_HAND_CARDS" || matchState === "SELECTING_PLAYER" ? "exit-right" : "enter"}`}>
                            {
                                discard.map((card, idx) => (
                                    <Card
                                        key={card.id}
                                        className="deck-card absolute w-24 h-36 flex items-center justify-center bg-white shadow"
                                        style={{
                                            left: `${idx * 2}px`,
                                            top: `${idx * 3}px`,
                                            zIndex: discard.length - idx,
                                            transform: `rotate(90deg) translateY(-30px) translateX(30px)`,
                                            backgroundImage: `url(${deckImg})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                        }}
                                    />
                                ))
                            }
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default GameHeader;