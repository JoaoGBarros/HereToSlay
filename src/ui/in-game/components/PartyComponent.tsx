import { PartyHero } from "@/ui/games/common/cards/partyHero/PartyHero";
import { PartyLeader } from "@/ui/games/common/cards/partyLeader/PartyLeader";
import { useEffect, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import { CARD_TYPE } from "@/ui/games/common/cards/handCards/HandCards";
import './css/PartyComponent.css'

interface PartyComponentProps {
    isPlayerTurn: boolean;
    currentPlayerData: any;
    partyLeaderSelection: boolean;
    monsterCard: Array<any>;
    availablePartyLeaders: Array<string>;
    socket: React.MutableRefObject<WebSocket | null> | null;
    id: string | undefined;
    currentPlayerIdx?: string;
    matchState?: string;
    loggedUserId?: string;
    turn?: string;
    cardIds?: Array<number>;
}

function PartyComponent({ isPlayerTurn, currentPlayerData, partyLeaderSelection, monsterCard,
    availablePartyLeaders, socket, id, currentPlayerIdx, matchState, loggedUserId, turn, cardIds }: PartyComponentProps) {

    const [heroPage, setHeroPage] = useState(0);
    const [currentHeroCards, setCurrentHeroCards] = useState<Array<any>>([]);
    const [heroPages, setHeroPages] = useState(0);
    const heroesPerPage = 6;
    const [selectedTargetCard, setSelectedTargetCard] = useState<number[] | null>(null);
    const [showTargetSign, setShowTargetSign] = useState(false);
    const [destroyedCardId, setDestroyedCardId] = useState<number | null>(null);
    const [isDestroying, setIsDestroying] = useState(false);
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
                if (data?.type === "animation" && data?.subtype === "destroy_card") {
                    console.log("Destroying card animation for cardId:", data.payload.cardId);
                    setDestroyedCardId(data.payload.cardId);
                    setIsDestroying(true);

                    destructionTimeout.current = setTimeout(() => {
                        setIsDestroying(false);
                        setDestroyedCardId(null);
                    }, 800);
                }
            } catch { }
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

            setShowTargetSign(currentPlayerIdx === turn);
        }
    }, [matchState, socket, currentPlayerIdx, turn, id]);


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
        setLocallyUsedCardIds((prev) => [...prev, cardId]);
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
                        <span>Selecione cartas de outros jogadores</span>
                    ) : (
                        <span>{currentPlayerData?.username} está selecionando alvos...</span>
                    )}
                </div>
            )}

            <div
                className='ml-4 flex party-leader items-center gap-4'
                style={{
                    width: `${!partyLeaderSelection ? 30 + monsterCard.length * 60 : 20 + 5 * 15}%`,
                    transition: 'width 0.3s'
                }}
            >

                {partyLeaderSelection ? (
                    <>
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
                    </>

                ) : (
                    <>
                        <div className={parseInt(currentPlayerIdx!) % 2 === 0 ? "leader-appear-animation-A" : "leader-appear-animation-B"}>
                            {currentPlayerData?.leader && (
                                <PartyLeader leader={currentPlayerData.leader} isSelectionStage={partyLeaderSelection} isPlayerTurn={isPlayerTurn} chooseLeader={handleChoosePartyLeader} />
                            )}
                            {monsterCard.map((card) => (
                                <PartyLeader key={card.id} leader='BARD' isSelectionStage={partyLeaderSelection} isPlayerTurn={isPlayerTurn} chooseLeader={handleChoosePartyLeader} />
                            ))}
                        </div>
                    </>

                )}
            </div>

            {heroPages > 1 && heroPage > 0 && (
                <button
                    onClick={() => setHeroPage(heroPage - 1)}
                    className="mx-2 px-2 py-1 bg-gray-200 rounded disabled:opacity-50 self-center"
                >
                    &lt;
                </button>
            )}

            <div ref={dropRef} style={{
                minHeight: "180px",
                border: isOver && canDrop ? "2px solid #4ade80" : "2px dashed #aaa",
                background: isOver && canDrop ? "#bbf7d0" : "transparent",
                borderRadius: "12px",
                transition: "all 0.2s",
                padding: "16px",
                width: "100%",
            }}>
                <div
                    className='heroCard-area grid grid-cols-3 items-center'
                    style={{
                        width: `100%`,
                        transition: 'width 0.3s'
                    }}
                >
                    {currentHeroCards?.length > 0 && currentHeroCards?.map((card, index) => {
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
                                className={`card-appear ${isDestroyed ? "destroy-animation" : ""} ${isUsed ? "grayscale" : ""}`}
                                style={{
                                    animationDelay: `${index * 100}ms`,
                                    position: "relative"
                                }}
                            >
                                <PartyHero
                                    id={card.cardId}
                                    handleCardUse={useHeroCard}
                                    isPlayerTurn={isPlayerTurn}
                                    isSelectable={isSelectable}
                                    isSelected={isSelected}
                                    onSelect={() => handleSelectPartyHeroTarget(card.cardId)}
                                    onDeselect={() => handleDeselectPartyHeroTarget(card.cardId)}

                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {heroPages > 1 && (
                <button
                    disabled={heroPage === heroPages - 1}
                    onClick={() => setHeroPage(heroPage + 1)}
                    className="mx-2 px-2 py-1 bg-gray-200 rounded disabled:opacity-50 self-center"
                >
                    &gt;
                </button>
            )}
        </>
    );
}
export default PartyComponent;