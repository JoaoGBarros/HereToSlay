import { Card } from "@heroui/card";
import './css/GameHeader.css';
import { useEffect, useState, useRef } from "react";
import { playSound } from "@/utils/SoundManager/SoundManager";
import { classAvatars } from "@/utils/ClassImages";

interface GameHeaderProps {
    playersData: { [id: string]: any };
    playerTags?: Record<string, { key: string; label: string }[]>;
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



function GameHeader({ playersData, playerTags, partyLeaderSelection, isPlayerTurn, diceRolled, socket, id, turn,
    currentPlayerIdx, deckImg, loggedUserId, setCurrentPlayerIdx, setCurrentPlayerData, autoSwitchView,
    setAutoSwitchView, matchState, maxSelectableCards, selectedCardsCount, selectedPlayerId}: GameHeaderProps) {

    const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const playerIds = Object.keys(playersData);

    const deck = [
        { id: 1, name: "Card 1" },
        { id: 2, name: "Card 2" },
        { id: 3, name: "Card 3" },
        { id: 4, name: "Card 4" },
        { id: 5, name: "Card 5" },
    ];

    const discard = [
        { id: 6, name: "Card 6" },
        { id: 7, name: "Card 7" },
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
            <div className="deck-discard-row ledger-bar flex flex-row gap-8 mb-1 justify-around items-center">
                <div
                    className={`deck-area deck-stack relative w-44 h-32 ${isPlayerTurn && diceRolled && !partyLeaderSelection ? 'deck-area-active' : ''}`}
                    onClick={handleDeckClick}
                    aria-disabled={!isPlayerTurn}
                >
                    <span className="ledger-pile-label">Deck</span>
                    {matchState === "SELECTING_CARDS" || matchState === "SELECTING_HAND_CARDS" || matchState === "SELECTING_PLAYER" ? (
                        <div className={`selection-counter selection-counter-panel w-[90%] h-[80%] flex flex-col items-center justify-center p-2 enter ${matchState === "SELECTING_CARDS" ? "enter" : "exit-left"
                            }`}>
                            <div className="text-2xl mt-2">
                                <span>{selectedCardsCount || (selectedPlayerId ? 1 : 0)}</span>
                                <span className="text-base"> / {maxSelectableCards ?? '...'}</span>
                            </div>
                        </div>
                    ) : (
                        <div className={`${matchState === "SELECTING_CARDS"  ? "exit-left" : "enter"
                            }`}>

                            {deck.map((card, idx) => (
                                <Card
                                    key={card.id}
                                    className="deck-card deck-card-face absolute w-24 h-36 flex items-center justify-center"
                                    style={{
                                        top: '50%',
                                        left: '50%',
                                        zIndex: deck.length - idx,
                                        transform: `translate(-50%, -50%) rotate(90deg) translate(${(idx - (deck.length - 1) / 2) * 2}px, ${(idx - (deck.length - 1) / 2) * 3}px)`,
                                        backgroundImage: `url(${deckImg})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className='player-turn-indicator turn-banner text-center flex flex-row justify-center items-center gap-2'>
                    {turn && turn.length > 0 && (
                        <>
                            <span className='turn-banner-label'>Turn:</span>
                            <strong className='turn-banner-name'>{playersData[turn]?.username}</strong>
                        </>
                    )}
                </div>
                <div className="player-switcher flex gap-4 mb-6 items-center" onWheel={handlePlayerSwitcherWheel} tabIndex={0}>
                    {Object.entries(playersData).map(([id, player]: [string, any]) => {
                        const isTurn = turn?.toString() === id;
                        const isLogged = loggedUserId?.toString() === id;
                        let boxShadow = "";
                        if (isLogged) boxShadow += "0 0 0 3px #d1a441,";
                        if (currentPlayerIdx === id && currentPlayerIdx != loggedUserId) boxShadow += `0 0 0 3px #8a6fc9,`;
                        if (isTurn) boxShadow += "0 0 0 6px #f3d488, 0 0 18px 2px rgba(243, 212, 136, 0.65),";
                        if (
                            (matchState === "SELECTING_CARDS" || matchState === "SELECTING_HAND_CARDS" || matchState === "SELECTING_PLAYER") &&
                            turn?.toString() === loggedUserId?.toString() &&
                            id !== loggedUserId?.toString()
                        ) {
                            boxShadow += "0 0 0 5px #c0455a,";
                        }

                        if(id === selectedPlayerId) {
                            boxShadow += "0 0 0 8px #4fb98d,";
                        }
                        if (boxShadow.endsWith(",")) boxShadow = boxShadow.slice(0, -1);

                        return (
                            <button
                                key={id}
                                disabled={partyLeaderSelection || (!diceRolled && isPlayerTurn && (matchState !== "SELECTING_CARDS" && matchState !== "SELECTING_HAND_CARDS" && matchState !== "SELECTING_PLAYER"))}
                                onMouseEnter={() => setHoveredPlayerId(id)}
                                onMouseLeave={() => setHoveredPlayerId(null)}
                                onClick={() => matchState === "SELECTING_PLAYER" && turn != loggedUserId ? handlePlayerChange(player, id) : openMenu(id)}
                                className={isTurn ? "player-medallion player-medallion-turn" : "player-medallion"}
                                style={{
                                    padding: 0,
                                    borderRadius: "50%",
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
                                {isLogged && (
                                    <span className="player-medallion-you-badge">YOU</span>
                                )}
                                {playerTags?.[id] && playerTags[id].length > 0 && (
                                    <div className="player-medallion-tags">
                                        {playerTags[id].map((tag) => (
                                            <span key={tag.key} className="player-medallion-tag">{tag.label}</span>
                                        ))}
                                    </div>
                                )}
                                {hoveredPlayerId === id && (
                                    <div className="gm-tooltip">
                                        {player.username}
                                    </div>
                                )}
                                {menuOpen === id && (
                                    <div ref={menuRef} className="gm-dropdown">
                                        <button
                                            className="gm-dropdown-item"
                                            onClick={() => handleView(id)}
                                        >
                                            View
                                        </button>
                                        <hr className="gm-dropdown-divider" />
                                        {matchState === "SELECTING_PLAYER" && id !== loggedUserId ? (
                                            <button
                                                className="gm-dropdown-item"
                                                onClick={() => handleSelect(id)}
                                            >
                                                {id == selectedPlayerId ? "Remove Selection" : "Select"}
                                            </button>
                                        ) : null}
                                    </div>
                                )}
                            </button>
                            
                        );
                    })}
                    <button
                        onClick={() => setAutoSwitchView(!autoSwitchView)}
                        className="auto-switch-toggle"
                        title={autoSwitchView ? "Auto-follow turn: on" : "Auto-follow turn: off (pinned)"}
                    >
                        <span className={`auto-switch-track ${autoSwitchView ? "auto-switch-track-on" : ""}`}>
                            <span className="auto-switch-knob" />
                        </span>
                        <span className="auto-switch-label">{autoSwitchView ? "AUTO" : "PINNED"}</span>
                    </button>

                </div>
                <div
                    className={`discard-area deck-stack relative w-44 h-32 `}
                >
                    <span className="ledger-pile-label">Discard</span>
                    {matchState === "SELECTING_CARDS" || matchState === "SELECTING_HAND_CARDS" || matchState === "SELECTING_PLAYER" || matchState === "SELECTING_PLAYER" ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <button
                                onClick={onConfirmSelection}
                                disabled={!isPlayerTurn || (selectedCardsCount! == 0 && matchState !== "SELECTING_PLAYER") || (!selectedPlayerId && matchState === "SELECTING_PLAYER")}
                                className={`selection-confirm ledger-confirm-btn ${matchState === "SELECTING_CARDS" || matchState === "SELECTING_HAND_CARDS" || matchState === "SELECTING_PLAYER" ? "enter" : "exit-right"
                                    }`}
                            >
                                Confirm Action
                            </button>
                        </div>
                    ) : (
                        <div className={`${matchState === "SELECTING_CARDS" || matchState === "SELECTING_HAND_CARDS" || matchState === "SELECTING_PLAYER" ? "exit-right" : "enter"}`}>
                            {
                                discard.map((card, idx) => (
                                    <Card
                                        key={card.id}
                                        className="deck-card deck-card-face discard-card-face absolute w-24 h-36 flex items-center justify-center"
                                        style={{
                                            top: '50%',
                                            left: '50%',
                                            zIndex: discard.length - idx,
                                            transform: `translate(-50%, -50%) rotate(90deg) translate(${(idx - (discard.length - 1) / 2) * 2}px, ${(idx - (discard.length - 1) / 2) * 3}px)`,
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