import './InGame.css';
import deckImg from '../assets/deck.png';
import { use, useContext, useEffect, useState } from 'react';
import bardIcon from '../assets/class-icons/bard.png';
import warriorIcon from '../assets/class-icons/warrior.png';
import mageIcon from '../assets/class-icons/mage.png';
import thiefIcon from '../assets/class-icons/thief.png';
import guardianIcon from '../assets/class-icons/guardian.png';
import rangerIcon from '../assets/class-icons/ranger.png';
import { useParams } from 'react-router-dom';
import WebSocketContext from '@/utils/WebSocketContext';
import GameHeader from './components/GameHeader';
import DiceComponent from './components/DiceComponent';
import PartyComponent from './components/PartyComponent';
import HandComponent from './components/HandComponent';
import PlayerInfoComponent from './components/PlayerInfoComponent';
import DiceBoardOrderComponent from './components/DiceBoardOrderComponent';
import DiceBoardHeroComponent from './components/DiceBoardHeroComponent';


function InGame() {

    const socket = useContext(WebSocketContext);
    const [playersData, setPlayersData] = useState<any>({});
    const loggedUserId = JSON.parse(localStorage.getItem('currentPlayer')!)?.id || 0;
    const [currentPlayerIdx, setCurrentPlayerIdx] = useState(loggedUserId);
    const [diceRolled, setDiceRolled] = useState(false);
    const [currentPlayerData, setCurrentPlayerData] = useState<any>(playersData[currentPlayerIdx]);
    const [matchState, setMatchState] = useState<string>("");
    const [turn, setTurn] = useState("");
    const [partyLeaderSelection, setPartyLeaderSelection] = useState(false);
    const [isPlayerTurn, setIsPlayerTurn] = useState(false);
    const [availablePartyLeaders, setAvailablePartyLeaders] = useState<string[]>([]);
    const [pendingHeroCard, setPendingHeroCard] = useState<boolean>(false);
    const [challengeHero, setChallengeHero] = useState<string>("");
    const [challengeOpponent, setChallengeOpponent] = useState<string>("");
    const [isPlayerChallenger, setIsPlayerChallenger] = useState(false);
    const [challengeWindowTime, setChallengeWindowTime] = useState(0);


    const [showChallengeButton, setShowChallengeButton] = useState(false);
    const [showHeroBoard, setShowHeroBoard] = useState(false);
    const [showHeroRollWaiting, setShowHeroRollWaiting] = useState(false);
    const [showChallenge, setShowChallenge] = useState(false);



    const classIcons: Record<string, string> = {
        "BARD": bardIcon,
        "WARRIOR": warriorIcon,
        "WIZARD": mageIcon,
        "THIEF": thiefIcon,
        "RANGER": rangerIcon,
        "GUARDIAN": guardianIcon,
    };

    const { id } = useParams();

    const monsterCard = [
        // { id: 1, name: "Goblin" },
        // { id: 2, name: "Orc" },
        // { id: 3, name: "Dragon" },
    ]

    function handleChallengeClick() {
        console.log("Challenge button clicked");
        if (socket && socket.current) {
            socket.current.send(JSON.stringify({
                type: 'match',
                subtype: 'challenge',
                id: id
            }));
        }
    }


    useEffect(() => {
        if (!socket || !socket.current) {
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'match') {
                    if (data.subtype === 'match_state' || data.subtype === 'order_finalized') {
                        console.log("Match state received:", data.payload);
                        setPlayersData(data.payload.players);
                        setMatchState(data.payload.matchState);
                        setTurn(data.payload.currentPlayerTurn);
                        setCurrentPlayerData(data.payload.players[currentPlayerIdx]);
                        setPendingHeroCard(data.payload.players[currentPlayerIdx]?.pendingHeroCard != null);
                        setAvailablePartyLeaders(data.payload.availablePartyLeaders || []);
                        setChallengeWindowTime(data.payload.challengeWindowTime || 0);
                    } else if (data.subtype === 'order_selection_tie') {
                        setPlayersData(data.payload.players);
                        setCurrentPlayerData(data.payload.players[currentPlayerIdx]);
                    } else if (data.subtype === 'challenge_window_open') {
                        console.log("Duel: " + data);
                        setShowChallengeButton(true);
                    } else if (data.subtype === 'duel_start') {
                        console.log("Duel Start: ", data.payload);
                        setChallengeHero(data.payload.heroPlayer);
                        setChallengeOpponent(data.payload.challenger);
                        setMatchState(data.payload.matchState);
                    } else if (data.subtype === 'duel_result') {
                        console.log("Duel Result: ", data.winner);
                        setMatchState("GAMEPLAY");
                    }
                }

            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };

        const ws = socket.current;
        ws.addEventListener('message', handleMessage);

        return () => {
            ws.removeEventListener('message', handleMessage);
        };
    }, [socket, currentPlayerIdx]);

    useEffect(() => {
        const player = playersData[currentPlayerIdx];
        if (player && (player.orderRoll === null || pendingHeroCard === true)) {
            setDiceRolled(false);
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
            setDiceRolled(true)
        }
    }, [matchState]);

    useEffect(() => {
        if (matchState === "CHALLENGE_ROLL") {
            setShowChallengeButton(false);
            if (currentPlayerIdx === challengeHero || currentPlayerIdx === challengeOpponent) {
                setDiceRolled(false);
                setIsPlayerChallenger(currentPlayerIdx === challengeHero || currentPlayerIdx === challengeOpponent);
                setShowChallengeButton(true);
            }
            setPendingHeroCard(false);
        }
    }, [currentPlayerIdx, challengeHero, challengeOpponent, matchState, pendingHeroCard, diceRolled]);


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
        if (pendingHeroCard === false && matchState !== "ORDER_SELECTION") {
           setDiceRolled(true);
        }
    }, [pendingHeroCard, matchState]);

    useEffect(() => {
        if (pendingHeroCard) {
            setShowHeroBoard(true);
        } else {
           setShowHeroBoard(false);
        }
    }, [pendingHeroCard]);

    return (
        <div className='ingame-background'>
            {showChallengeButton && (
                <div className="challenge-button-container">
                    <button onClick={handleChallengeClick}>Challenge</button>
                </div>
            )}
            <div className='player-area'>

                <GameHeader
                    playersData={playersData}
                    partyLeaderSelection={partyLeaderSelection}
                    isPlayerTurn={isPlayerTurn}
                    diceRolled={diceRolled}
                    socket={socket}
                    id={id}
                    turn={turn}
                    setCurrentPlayerData={setCurrentPlayerData}
                    setCurrentPlayerIdx={setCurrentPlayerIdx}
                    currentPlayerIdx={currentPlayerIdx}
                    deckImg={deckImg}
                    loggedUserId={loggedUserId}
                />

                { }

                <div className='party-area flex'>
                    {!diceRolled ? (
                        <>
                            <DiceComponent
                                currentPlayerIdx={currentPlayerIdx}
                                loggedUserId={loggedUserId}
                                socket={socket}
                                id={id}
                                currentPlayerData={currentPlayerData}
                                pendingHeroCard={showHeroBoard}
                                isPlayerChallenger={isPlayerChallenger}
                                challengeWindowDuration={challengeWindowTime}
                            />

                            {showHeroBoard ? (
                                <DiceBoardHeroComponent currentPlayerData={currentPlayerData} />
                            ) : (
                                (matchState === "ORDER_SELECTION" || matchState === "CHALLENGE_ROLL") && (
                                    <DiceBoardOrderComponent playersData={playersData} isChallenger={matchState === "CHALLENGE_ROLL"} challengerHero={playersData[challengeHero]} challengerOpponent={playersData[challengeOpponent]} />
                                )
                            )}

                        </>

                    ) : (
                        <PartyComponent
                            isPlayerTurn={isPlayerTurn}
                            currentPlayerData={currentPlayerData}
                            partyLeaderSelection={partyLeaderSelection}
                            monsterCard={monsterCard}
                            availablePartyLeaders={availablePartyLeaders}
                            socket={socket}
                            id={id}
                        />
                    )}
                </div>


                <div className='hand-area flex relative row mt-10'>
                    <PlayerInfoComponent currentPlayerData={currentPlayerData} />
                    <HandComponent
                        currentPlayerData={currentPlayerData}
                        currentPlayerIdx={currentPlayerIdx}
                        loggedUserId={loggedUserId}
                    />
                </div>

            </div>

        </div>
    );
}

export default InGame;