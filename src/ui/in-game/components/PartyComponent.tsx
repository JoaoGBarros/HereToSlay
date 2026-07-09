import { PartyHero } from "@/ui/games/common/cards/partyHero/PartyHero";
import { PartyLeader } from "@/ui/games/common/cards/partyLeader/PartyLeader";
import { useEffect, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import { CARD_TYPE } from "@/ui/games/common/cards/handCards/HandCards";
import MonsterComponent, { type MonsterData } from "./MonsterComponent";
import './css/PartyComponent.css'

interface PartyComponentProps {
    isPlayerTurn: boolean;
    currentPlayerData: any;
    partyLeaderSelection: boolean;
    monsters: Array<MonsterData>;
    availablePartyLeaders: Array<string>;
    socket: React.MutableRefObject<WebSocket | null> | null;
    id: string | undefined;
    currentPlayerIdx?: string;
    matchState?: string;
    loggedUserId?: string;
    turn?: string;
    cardIds?: Array<number>;
}

function PartyComponent({ isPlayerTurn, currentPlayerData, partyLeaderSelection, monsters,
    availablePartyLeaders, socket, id, currentPlayerIdx, matchState, loggedUserId, turn, cardIds }: PartyComponentProps) {

    const [heroPage, setHeroPage] = useState(0);
    const [currentHeroCards, setCurrentHeroCards] = useState<Array<any>>([]);
    const [heroPages, setHeroPages] = useState(0);
    const heroesPerPage = 3;
    const [selectedTargetCard, setSelectedTargetCard] = useState<number[] | null>(null);
    const [showTargetSign, setShowTargetSign] = useState(false);
    const [destroyedCardId, setDestroyedCardId] = useState<number | null>(null);
    const [isDestroying, setIsDestroying] = useState(false);
    const [removalAnimation, setRemovalAnimation] = useState<"destroy-animation" | "steal-animation">("destroy-animation");
    const [locallyUsedCardIds, setLocallyUsedCardIds] = useState<number[]>([]);
    const destructionTimeout = useRef<NodeJS.Timeout | null>(null);

    const classes = ["BARD", "FIGHTER", "GUARDIAN", "RANGER", "THIEF", "WIZARD"];

    useEffect(() => {
        setHeroPage(0);
        setLocallyUsedCardIds([]);
    }, [currentPlayerData]);

    useEffect(() => {
        setSelectedTargetCard(cardIds || null);
    }, [cardIds]);

    useEffect(() => {
        if (!socket || !socket.current) return;

        const ws = socket.current;
        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data?.type === "animation" && (data?.subtype === "destroy_card" || data?.subtype === "steal_card")) {
                    console.log("Destroying card animation for cardId:", data.payload.cardId);
                    setSelectedTargetCard(null);
                    setDestroyedCardId(data.payload.cardId);
                    setRemovalAnimation(data.subtype === "steal_card" ? "steal-animation" : "destroy-animation");
                    setIsDestroying(true);

                    destructionTimeout.current = setTimeout(() => {
                        setIsDestroying(false);
                        setDestroyedCardId(null);
                    }, 800);
                }
            } catch { /* empty */ }
        };

        ws.addEventListener("message", handleMessage);
        return () => {
            ws.removeEventListener("message", handleMessage);
            if (destructionTimeout.current) clearTimeout(destructionTimeout.current);
        };
    }, [socket]);


    useEffect(() => {
        if (matchState === "SELECTING_CARDS") {
            if (socket && socket.current) {
                socket.current.send(JSON.stringify({
                    type: 'match',
                    subtype: 'get_selected_targets',
                    id: id,
                }));
            }
        }
    }, [matchState, socket, currentPlayerIdx, turn, id]);


    useEffect(() => {
        if (matchState === "SELECTING_CARDS" || matchState === "SELECTING_HAND_CARDS" || matchState === "SELECTING_PLAYER") {
            console.log("Setting showTargetSign:", currentPlayerIdx === turn, loggedUserId === turn);
            setShowTargetSign(currentPlayerIdx === turn);
        }
    }, [matchState, currentPlayerIdx, turn]);


    useEffect(() => {

        if (currentPlayerData?.party) {

            setCurrentHeroCards(currentPlayerData?.party.slice(
                heroPage * heroesPerPage,
                heroPage * heroesPerPage + heroesPerPage
            ));

            setHeroPages(Math.ceil(currentPlayerData?.party.length / heroesPerPage));
        }
    }, [currentPlayerData, heroPage]);


    function handleChoosePartyLeader(leader: string) {
        if (socket && socket.current) {
            socket.current.send(JSON.stringify({
                type: 'match',
                subtype: 'choose_party_leader',
                id: id,
                payload: {
                    party_leader: leader,
                }
            }));
        }
    }


    function handleSelectPartyHeroTarget(cardId: number) {

        if (socket && socket.current && matchState === "SELECTING_CARDS" && isPlayerTurn && currentPlayerIdx !== loggedUserId) {
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

    function handleDeselectPartyHeroTarget(cardId: number) {

        if (socket && socket.current && matchState === "SELECTING_CARDS" && isPlayerTurn && currentPlayerIdx !== loggedUserId) {
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

    const useHeroCard = (cardId: number) => {
        if (socket && socket.current && isPlayerTurn) {
            socket.current.send(JSON.stringify({
                type: 'match',
                subtype: 'action',
                action: 'use_card',
                id: id,
                payload: {
                    card_id: cardId,
                }
            }));
        }
    }

    const [{ isOver, canDrop }, dropRef] = useDrop({
        accept: CARD_TYPE,
        drop: (item: { id: number; isUserCard: boolean }) => {
            if (socket && socket.current && isPlayerTurn) {
                socket.current.send(JSON.stringify({
                    type: 'match',
                    subtype: 'action',
                    action: 'play_card',
                    id: id,
                    payload: {
                        card_id: item.id,
                    }
                }));
            }
            setLocallyUsedCardIds((prev) => [...prev, item.id]);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    return (
        <>

            {showTargetSign && (
                <div style={{
                    position: "absolute",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    left: "0",
                    top: "0",
                    width: "100%",
                    height: "100%",
                    background: "rgba(17, 4, 4, 0.7)",
                    backdropFilter: "blur(2px)",
                    color: "white",
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: "1.5rem",
                    padding: "12px 0",
                    zIndex: 1000
                }}>
                    {loggedUserId === turn ? (
                        <span>Select cards from other players</span>
                    ) : (
                        <span>{currentPlayerData?.username} is selecting targets...</span>
                    )}
                </div>
            )}

            {partyLeaderSelection ? (
                <div className="leader-picker-grid">
                    {classes.map((leaderClass, index) => {
                        const isSelectable = availablePartyLeaders.includes(leaderClass);
                        return (
                            <div
                                key={leaderClass}
                                style={{ animationDelay: `${index * 150}ms` }}
                                className={`card-appear ${!isSelectable ? 'grayscale' : ''}`}
                            >
                                <PartyLeader
                                    leader={leaderClass}
                                    isSelectionStage={partyLeaderSelection}
                                    isPlayerTurn={isPlayerTurn}
                                    chooseLeader={isSelectable ? handleChoosePartyLeader : () => { }}
                                />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="battlefield">
                    <div className="monster-lane">
                        <span className="monster-lane-label">Monsters</span>
                        <div className="monster-lane-cards">
                            {monsters.slice(0, 3).map((monster) => (
                                <MonsterComponent key={monster.id} monster={monster} socket={socket} id={id} isPlayerTurn={isPlayerTurn} matchState={matchState} />
                            ))}
                        </div>
                    </div>

                    <div className="battlefield-row">
                        <div className={`leader-frame battlefield-card-slot ${parseInt(currentPlayerIdx!) % 2 === 0 ? "leader-appear-animation-A" : "leader-appear-animation-B"}`}>
                            <span className="leader-frame-ring" />
                            {currentPlayerData?.leader && (
                                <PartyLeader leader={currentPlayerData.leader} isSelectionStage={partyLeaderSelection} isPlayerTurn={isPlayerTurn} chooseLeader={handleChoosePartyLeader} className="leader-frame-card" />
                            )}
                        </div>

                        <div
                            ref={dropRef}
                            className={`hero-drop-zone ${isOver && canDrop ? "hero-drop-zone-active" : ""}`}
                        >
                            {heroPages > 1 && heroPage > 0 && (
                                <button
                                    onClick={() => setHeroPage(heroPage - 1)}
                                    className="hero-page-nav hero-page-nav-prev"
                                >
                                    &lt;
                                </button>
                            )}

                            <div className='heroCard-area'>
                                {currentHeroCards?.length > 0 ? currentHeroCards?.map((card, index) => {
                                    const isSelectable = (
                                        matchState === "SELECTING_CARDS" &&
                                        isPlayerTurn &&
                                        currentPlayerIdx !== loggedUserId
                                    );
                                    const isSelected = selectedTargetCard?.includes(card.cardId) ?? false;
                                    const isDestroyed = destroyedCardId === card.cardId && isDestroying;
                                    const isUsed = (currentPlayerData?.usedCardIds?.includes(card.cardId) || locallyUsedCardIds.includes(card.cardId));
                                    return (
                                        <div
                                            key={card.cardId}
                                            className={`card-appear ${isDestroyed ? removalAnimation : ""} ${isUsed ? "grayscale" : ""}`}
                                            style={{
                                                animationDelay: `${index * 100}ms`,
                                                position: "relative"
                                            }}
                                        >
                                            <PartyHero
                                                id={card.cardId}
                                                cardName={card.cardName}
                                                heroClass={card.heroClass}
                                                diceValue={card.diceValue}
                                                width={170}
                                                height={238}
                                                handleCardUse={useHeroCard}
                                                isPlayerTurn={isPlayerTurn}
                                                isSelectable={isSelectable}
                                                isSelected={isSelected}
                                                onSelect={() => handleSelectPartyHeroTarget(card.cardId)}
                                                onDeselect={() => handleDeselectPartyHeroTarget(card.cardId)}

                                            />
                                        </div>
                                    );
                                }) : (
                                    <div className="hero-drop-zone-empty">Drag a hero from your hand here</div>
                                )}
                            </div>

                            {heroPages > 1 && (
                                <button
                                    disabled={heroPage === heroPages - 1}
                                    onClick={() => setHeroPage(heroPage + 1)}
                                    className="hero-page-nav hero-page-nav-next"
                                >
                                    &gt;
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
export default PartyComponent;