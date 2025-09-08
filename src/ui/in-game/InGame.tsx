import { Avatar } from '@heroui/avatar';
import './InGame.css';
import avatarImg from '../assets/150.jpg';
import { Card } from '@heroui/card';
import deckImg from '../assets/deck.png';
import bardImg from '../assets/party-leader/bard.png';
import { PartyLeader } from '../games/common/cards/partyLeader/PartyLeader';
import { PartyHero } from "../games/common/cards/partyHero/PartyHero";
import { useContext, useEffect, useState } from 'react';
import HandCards from '../games/common/cards/handCards/HandCards';
import iconPlayer from "../assets/class-avatars/bard.png";
import bardIcon from '../assets/class-icons/bard.png';
import warriorIcon from '../assets/class-icons/warrior.png';
import mageIcon from '../assets/class-icons/mage.png';
import thiefIcon from '../assets/class-icons/thief.png';
import guardianIcon from '../assets/class-icons/guardian.png';
import rangerIcon from '../assets/class-icons/ranger.png';
import bardAvatar from '../assets/class-avatars/bard.png';
import warriorAvatar from '../assets/class-avatars/fighter.png';
import wizardAvatar from '../assets/class-avatars/wizard.png';
import thiefAvatar from '../assets/class-avatars/thief.png';
import guardianAvatar from '../assets/class-avatars/guardian.png';
import rangerAvatar from '../assets/class-avatars/ranger.png';
import { useParams } from 'react-router-dom';
import WebSocketContext from '@/utils/WebSocketContext';
import { Button } from '@heroui/react';
import Dice from 'react-dice-roll';


function InGame() {

    let maxPoints = 3;
    const socket = useContext(WebSocketContext);
    const user = localStorage.getItem('currentPlayer');
    const [playersData, setPlayersData] = useState<any>({});
    const loggedUserId = JSON.parse(localStorage.getItem('currentPlayer')!)?.id || 0;
    const [currentPlayerIdx, setCurrentPlayerIdx] = useState(loggedUserId);
    const [diceRolled, setDiceRolled] = useState(false);
    const [dice1Result, setDice1Result] = useState<number | null>(null);
    const [dice2Result, setDice2Result] = useState<number | null>(null);
    const [currentPlayerData, setCurrentPlayerData] = useState<any>(playersData[currentPlayerIdx]);
    const [matchState, setMatchState] = useState<string>("");
    const [turn, setTurn] = useState("");
    const [partyLeaderSelection, setPartyLeaderSelection] = useState(false);
    const [isPlayerTurn, setIsPlayerTurn] = useState(false);
    const [availablePartyLeaders, setAvailablePartyLeaders] = useState<string[]>([]);
    const [currentHeroCards, setCurrentHeroCards] = useState<any[]>([]);
    const [heroPages, setHeroPages] = useState(0);


    const classIcons: Record<string, string> = {
        "BARD": bardIcon,
        "WARRIOR": warriorIcon,
        "WIZARD": mageIcon,
        "THIEF": thiefIcon,
        "RANGER": rangerIcon,
        "GUARDIAN": guardianIcon,
    };

    const classAvatars: Record<string, string> = {
        "BARD": bardAvatar,
        "WARRIOR": warriorAvatar,
        "WIZARD": wizardAvatar,
        "THIEF": thiefAvatar,
        "RANGER": rangerAvatar,
        "GUARDIAN": guardianAvatar,
    };

    const [points, setPoints] = useState(3);
    const { id } = useParams();
    const [showTooltip, setShowTooltip] = useState(false);
    const [showTooltipSwitcher, setShowTooltipSwitcher] = useState(false);
    const [showMyHand, setShowMyHand] = useState(false);
    const userid = 1;
    const players = [
        { id: 1, nickname: "Jogador123", avatar: iconPlayer },
        { id: 2, nickname: "Maria", avatar: avatarImg },
        { id: 3, nickname: "Carlos", avatar: avatarImg },
        { id: 4, nickname: "Jogador123", avatar: iconPlayer },
        { id: 5, nickname: "Maria", avatar: avatarImg },
        { id: 6, nickname: "Carlos", avatar: avatarImg },
    ];
    const [currentPlayer, setCurrentPlayer] = useState(players[0]);


    function handlePlayerChange(player: any, id: string) {
        setShowMyHand(false);
        setCurrentPlayerIdx(id);
        setCurrentPlayerData(playersData[id]);

    }

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


    const [hand, setHand] = useState([
        { id: 1, name: "Carta 1" },
        { id: 2, name: "Carta 2" },
        { id: 3, name: "Carta 3" },
        { id: 4, name: "Carta 3" },
        { id: 5, name: "Carta 3" },
        { id: 6, name: "Carta 3" },
        { id: 7, name: "Carta 3" },
        { id: 8, name: "Carta 3" },
        { id: 9, name: "Carta 3" },
    ]);

    const monsterCard = [
        // { id: 1, name: "Goblin" },
        // { id: 2, name: "Orc" },
        // { id: 3, name: "Dragon" },
    ]

    const [heroPage, setHeroPage] = useState(0);
    const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
    const heroesPerPage = 6;

    useEffect(() => {

        if (currentPlayerData?.party) {
            const heroPages = Math.ceil(currentPlayerData?.party.length / heroesPerPage);

            const currentHeroCards = currentPlayerData?.party.slice(
                heroPage * heroesPerPage,
                heroPage * heroesPerPage + heroesPerPage
            );

            
        }
    }, [currentPlayerData]);


    function handleOnDrag(e: React.DragEvent) {
        e.dataTransfer.effectAllowed = "move";
        console.log("drag");
        e.dataTransfer.setData("cardId", e.currentTarget.id);
    }

    function handleOnDrop(e: React.DragEvent) {
        console.log("drop");
        const id = e.dataTransfer.getData("cardId");
        console.log(id);
        const cardToAdd = hand.find(card => card.id.toString() === id);
        if (cardToAdd) {
            setHand(prevHand => prevHand.filter(card => card.id.toString() !== id));
        }
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }

    function handleDeckClick() {
        if (isPlayerTurn && diceRolled && !partyLeaderSelection) {
            if (socket && socket.current) {
                socket.current.send(JSON.stringify({
                    type: 'match',
                    subtype: 'draw_card',
                    id: id
                }));
            }
        }

    }

    function handleDiscardAll() {
        console.log("Discard all cards");
        setPoints(prevPoints => prevPoints - 1);
        setHand([]);
    }

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

    if (socket && socket.current) {
        socket.current.onmessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'match') {
                    if (data.subtype === 'match_state' || data.subtype === 'order_finalized') {
                        console.log("Match state received:", data.payload);
                        setPlayersData(data.payload.players);
                        setMatchState(data.payload.matchState);
                        setTurn(data.payload.currentPlayerTurn);
                        setCurrentPlayerData(data.payload.players[currentPlayerIdx]);
                        setAvailablePartyLeaders(data.payload.availablePartyLeaders || []);
                    } if (data.subtype === 'order_selection_tie') {
                        setPlayersData(data.payload.players);
                        setCurrentPlayerData(data.payload.players[currentPlayerIdx]);
                    }

                    if (data.subtype === 'drawn_card') {
                        setMatchState(data.payload.matchState);
                        setPlayersData(data.payload.players);
                        setCurrentPlayerData(data.payload.players[currentPlayerIdx]);
                    }
                }

            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };
    }

    useEffect(() => {
        const player = playersData[currentPlayerIdx];
        if (player && player.orderRoll === null) {
            setDiceRolled(false);
            setDice1Result(null);
            setDice2Result(null);
        }
    }, [currentPlayerIdx, playersData]);


    useEffect(() => {
        if (turn && turn.length > 0) {
            setCurrentPlayerIdx(turn);
            setCurrentPlayerData(playersData[turn]);
            setIsPlayerTurn(turn === loggedUserId);
        }
    }, [turn]);




    useEffect(() => {
        if (matchState === "PARTY_LEADER_SELECTION") {
            setDiceRolled(true);
            setPartyLeaderSelection(true);
        }
    }, [matchState]);

    useEffect(() => {
        if (matchState == "GAMEPLAY") {
            setPartyLeaderSelection(false);
            setAvailablePartyLeaders([]);
            setDiceRolled(true);
        }
    }, [matchState]);


    useEffect(() => {
        if (socket && socket.current) {
            socket.current.send(JSON.stringify({
                type: 'match',
                subtype: 'get_match_state',
                id: id
            }));
        }
    }, [socket, id]);

    useEffect(() => {
        if (dice1Result !== null && dice2Result !== null) {
            setDiceRolled(true);
            if (socket && socket.current) {
                socket.current.send(JSON.stringify({
                    type: 'match',
                    subtype: 'order_selection',
                    id: id,
                    payload: {
                        roll: dice1Result + dice2Result,
                    }
                }));
            }
        }
    }, [dice1Result, dice2Result, socket]);



    return (
        <div className='ingame-background'>
            <div className='player-area'>

                <div className="deck-discard-row flex flex-row gap-8 mb-5 justify-around items-center">
                    <div className="deck-area deck-stack relative w-32 h-44" onClick={handleDeckClick}>
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
                    <div className='player-turn-indicator text-center flex flex-row justify-center items-center gap-2'>
                        {turn && turn.length > 0 && (
                            <>
                                <span className='font-bold' style={{ color: '#b48a5a' }}>Turno do jogador:</span>
                                <br />
                                <strong style={{ color: 'white' }}>{playersData[turn]?.username}</strong>
                            </>
                        )}
                    </div>
                    <div className="player-switcher flex gap-4 mb-6 items-center">
                        {Object.entries(playersData).map(([id, player]: [string, any]) => {
                            // Flags para cada borda
                            const isTurn = turn?.toString() === id;
                            const isLogged = loggedUserId?.toString() === id;
                            let boxShadow = "";
                            if (isLogged) boxShadow += "0 0 0 4px #e2b007,";
                            if (currentPlayerIdx === id && currentPlayerIdx != loggedUserId) boxShadow += `0 0 0 4px #ff00d4ff,`;
                            if (isTurn) boxShadow += "0 0 0 8px #4fc3f7,";
                            if (boxShadow.endsWith(",")) boxShadow = boxShadow.slice(0, -1);

                            return (
                                <button
                                    key={id}
                                    disabled={partyLeaderSelection || !diceRolled}
                                    onMouseEnter={() => setHoveredPlayerId(id)}
                                    onMouseLeave={() => setHoveredPlayerId(null)}
                                    onClick={() => handlePlayerChange(player, id)}
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
                                </button>
                            );
                        })}
                    </div>
                    <div className="discard-area deck-stack relative w-32 h-44">
                        {discard.map((card, idx) => (
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
                        ))}
                    </div>
                </div>

                <div className='party-area flex'>
                    {!diceRolled ? (
                        <div className="dice-selection-container justify-center items-center">
                            <h2>Role o dado para começar!</h2>
                            <div className='dices flex gap-8'>
                                <Dice
                                    onRoll={(value) => {
                                        setDice1Result(value);
                                        console.log("Dado 1 rolado:", value);
                                    }}
                                />
                                <Dice
                                    onRoll={(value) => {
                                        setDice2Result(value);
                                        console.log("Dado 2 rolado:", value);
                                    }}
                                />
                            </div>
                            {(dice1Result !== null || dice2Result !== null) && (
                                <p>
                                    {dice1Result !== null && `Dado 1: ${dice1Result} `}
                                    {dice2Result !== null && `Dado 2: ${dice2Result}`}
                                </p>
                            )}
                        </div>
                    ) : (
                        <>
                            <div
                                className='ml-4 flex party-leader items-center gap-4'
                                style={{
                                    width: `${partyLeaderSelection ? 20 + monsterCard.length * 15 : 20 + 5 * 15}%`,
                                    transition: 'width 0.3s'
                                }}
                            >

                                {partyLeaderSelection ? (
                                    <>
                                        {availablePartyLeaders.map((leader) => (
                                            <PartyLeader
                                                key={leader}
                                                leader={leader}
                                                isSelectionStage={partyLeaderSelection}
                                                isPlayerTurn={isPlayerTurn}
                                                chooseLeader={handleChoosePartyLeader}
                                            />
                                        ))}
                                    </>

                                ) : (
                                    <>
                                        {currentPlayerData?.leader && (
                                            <PartyLeader leader={currentPlayerData.leader} isSelectionStage={partyLeaderSelection} isPlayerTurn={isPlayerTurn} chooseLeader={handleChoosePartyLeader} />
                                        )}
                                        {monsterCard.map((card) => (
                                            <PartyLeader key={card.id} leader='BARD' isSelectionStage={partyLeaderSelection} isPlayerTurn={isPlayerTurn} chooseLeader={handleChoosePartyLeader} />
                                        ))}
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

                            <div
                                className='heroCard-area grid grid-cols-3 items-center'
                                style={{
                                    width: `70%`,
                                    transition: 'width 0.3s'
                                }}
                                onDrop={handleOnDrop}
                                onDragOver={handleDragOver}
                            >
                                {currentHeroCards?.map((card) => (
                                    <PartyHero id={card.id.toString()} />
                                ))}
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
                    )}
                </div>


                <div className='hand-area flex relative row mt-10'>
                    <Card className='p-10 h-full player-info-card' >
                        <div className='player-info h-full content-center flex items-center flex-col gap-10'>
                            <div className='discard-all-cards'>
                                <button onClick={handleDiscardAll} className='bg-red-500 text-white px-4 py-2 rounded'>
                                    Reset Cards
                                </button>
                            </div>
                            <div className="avatar-tooltip-wrapper" style={{ position: "relative", display: "inline-block" }}>
                                <img
                                    src={currentPlayerData?.leader ? classAvatars[currentPlayerData.leader] : avatarImg}
                                    alt="Player"
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '2px solid #e2b007',
                                        background: '#fff',
                                        zIndex: 10,
                                        marginBottom: '8px'
                                    }}
                                    onMouseEnter={() => setShowTooltip(true)}
                                    onMouseLeave={() => setShowTooltip(false)}
                                />
                                {showTooltip && (
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
                                        {currentPlayerData?.username}
                                    </div>
                                )}
                            </div>
                            <div className='action-points flex items-center gap-2'>
                                {Array.from({ length: currentPlayerData?.maxAP }).map((_, idx) => (
                                    <span
                                        key={idx}
                                        style={{
                                            display: 'inline-block',
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            background: idx < currentPlayerData?.currentAP ? 'gold' : '#bbb',
                                            marginLeft: '4px',
                                            border: '2px solid #e2b007',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </Card>
                    <div className='hand-cards'>
                        {currentPlayerData && currentPlayerData.hand ? (
                            currentPlayerData.hand.map((card: any, idx: any) => {
                                const total = currentPlayerData.hand.length;
                                const spread = 15;
                                const start = -spread / 2;
                                const angle = start + (spread / (total - 1 || 1)) * idx;
                                const scale = total > 13 ? Math.max(0.4, 1 - 0.05 * (total - 13)) : 1;
                                const baseSpacing = 120;
                                const spacing = total > 7 ? baseSpacing * Math.max(0.4, 1 - 0.04 * (total - 7)) : baseSpacing;
                                console.log({ card, idx });
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
                                        <HandCards onDrag={handleOnDrag} card={{ id: card.cardId }} isUserCard={currentPlayerIdx === loggedUserId} />
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
                                onClick={() => {
                                    setShowMyHand(true);
                                }}
                            >
                                Mostrar minhas cartas
                            </button>
                        )}
                    </div>
                    <div
                        className="class-counter"
                        style={{
                            position: "absolute",
                            top: 24,
                            right: 24,
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            background: "rgba(255,255,255,0.95)",
                            borderRadius: "12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                            padding: "12px 16px",
                            zIndex: 100,
                            alignItems: "flex-end"
                        }}
                    >
                        {/* {Object.entries(classCounts).map(([className, count]) => (
                            <div key={className} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <img
                                    src={classIcons[className]}
                                    alt={className}
                                    style={{ width: 28, height: 28, objectFit: "contain" }}
                                />
                                <span style={{ fontWeight: 700, color: "#b48a5a", fontSize: 18 }}>{count}</span>
                            </div>
                        ))} */}
                    </div>
                </div>

            </div>

        </div>
    );
}

export default InGame;