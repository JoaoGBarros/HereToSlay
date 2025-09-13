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
import ChallengeButton from './components/ChallengeButton';
import { playBackgroundMusic, playClassSound, playSound, type ClassSoundType } from '@/utils/SoundManager/SoundManager';
import TurnIndicator from './components/TurnIndicator';

function InGame() {

    const socket = useContext(WebSocketContext);
    const [playersData, setPlayersData] = useState<any>({});
    const loggedUserId = JSON.parse(localStorage.getItem('currentPlayer')!)?.id || 0;
    const [currentPlayerIdx, setCurrentPlayerIdx] = useState(loggedUserId);
    const [diceRolled, setDiceRolled] = useState<{ [playerId: string]: boolean }>({});
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
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [hasPlayerChallenged, setHasPlayerChallenged] = useState(false);
    const [showTurnIndicator, setShowTurnIndicator] = useState(false);
    const [pendingTurn, setPendingTurn] = useState<string | null>(null)
    const [autoSwitchView, setAutoSwitchView] = useState(true);

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
    useEffect(() => {
        playBackgroundMusic();
    }, []);

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
                        setHasPlayerChallenged((data.payload.challengerSet || []).includes(loggedUserId));
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
                    }
                }

                if (data.type === 'sound' && data.subtype === 'play_class_sound') {
                    console.log("Play class sound:", data.payload);
                    const className = data.payload as ClassSoundType;
                    if (className) {
                        playClassSound(className);
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
        if (!player) return;

        const needsToRollForOrder = matchState === "ORDER_SELECTION" && player.orderRoll === null;
        const needsToRollForHero = player.pendingHeroCard != null;
        const needsToRollForChallenge = matchState === "CHALLENGE_ROLL" && (currentPlayerIdx === challengeHero || currentPlayerIdx === challengeOpponent);

        if (needsToRollForOrder || needsToRollForHero || needsToRollForChallenge) {
            setDiceRolled((prev) => ({ ...prev, [currentPlayerIdx]: false }));
        } else {
            setDiceRolled((prev) => ({ ...prev, [currentPlayerIdx]: true }));
        }
    }, [currentPlayerIdx, playersData, matchState, challengeHero, challengeOpponent]);


    useEffect(() => {
        if (turn && turn.length > 0) {
            if (turn !== currentPlayerIdx) {
                setShowTurnIndicator(false);
                setPendingTurn(turn);
                setTimeout(() => {
                    if(autoSwitchView){
                        setCurrentPlayerIdx(turn);
                        setCurrentPlayerData(playersData[turn]);
                    }
                    if (matchState !== "PARTY_LEADER_SELECTION") {
                        setShowTurnIndicator(true);
                        setTimeout(() => setShowTurnIndicator(false), 1500);
                    }
                }, 500);
            } else {
                setCurrentPlayerIdx(turn);
                setCurrentPlayerData(playersData[turn]);
            }
            setIsPlayerTurn(turn === loggedUserId);
        }
    }, [turn]);

    useEffect(() => {

        if (matchState === "PARTY_LEADER_SELECTION") {
            setDiceRolled((prev) => ({ ...prev, [currentPlayerIdx]: true }));
            setPartyLeaderSelection(true);
        }
    }, [matchState]);

    useEffect(() => {
        if (matchState == "GAMEPLAY") {
            setPartyLeaderSelection(false);
            setAvailablePartyLeaders([]);
            setDiceRolled((prev) => ({ ...prev, [currentPlayerIdx]: true }));
        }
    }, [matchState]);

    useEffect(() => {
        if (matchState === "CHALLENGE_ROLL") {
            playSound('challenge');
            setIsPlayerChallenger(loggedUserId === challengeHero || loggedUserId === challengeOpponent);
            setDiceRolled((prev) => ({
                ...prev,
                [challengeHero]: false,
                [challengeOpponent]: false,
            }));
            setPendingHeroCard(false);
        }
    }, [currentPlayerIdx, challengeHero, challengeOpponent, matchState, loggedUserId]);

    useEffect(() => {
        if (matchState === "WAITING_HERO_ROLL") {
            setIsPlayerChallenger(false);
            setChallengeHero("");
            setChallengeOpponent("");
        }
    }, [matchState, challengeHero, challengeOpponent]);




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
        if (playersData && playersData[currentPlayerIdx]) {
            setCurrentPlayerData(playersData[currentPlayerIdx]);
            setPendingHeroCard(playersData[currentPlayerIdx]?.pendingHeroCard != null);
        }
    }, [currentPlayerIdx, playersData]);

    // useEffect(() => {
    //     if (pendingHeroCard === false && matchState !== "ORDER_SELECTION") {
    //         setDiceRolled((prev) => ({ ...prev, [currentPlayerIdx]: true }));
    //     }
    // }, [pendingHeroCard, matchState]);

    useEffect(() => {
        if (pendingHeroCard) {
            setShowHeroBoard(true);
        } else {
            setShowHeroBoard(false);
        }
    }, [pendingHeroCard]);

    return (
        <div className='ingame-background'>
            {!showTurnIndicator ? (
                <div className='player-area'>

                    <GameHeader
                        playersData={playersData}
                        partyLeaderSelection={partyLeaderSelection}
                        isPlayerTurn={isPlayerTurn}
                        diceRolled={diceRolled[currentPlayerIdx]}
                        socket={socket}
                        id={id}
                        turn={turn}
                        setCurrentPlayerData={setCurrentPlayerData}
                        setCurrentPlayerIdx={(newIdx: string) => {
                            if (newIdx !== currentPlayerIdx) {
                                setIsTransitioning(true);
                                setTimeout(() => {
                                    setCurrentPlayerIdx(newIdx);
                                    setIsTransitioning(false);
                                }, 300);
                            }
                        }}
                        currentPlayerIdx={currentPlayerIdx}
                        deckImg={deckImg}
                        loggedUserId={loggedUserId}
                        autoSwitchView={autoSwitchView}
                        setAutoSwitchView={setAutoSwitchView}
                    />

                    <div className={`party-area flex ${isTransitioning ? 'slide-out' : 'slide-in'}`}>
                        {!showTurnIndicator ? (
                            !diceRolled[currentPlayerIdx] ? (
                                <>
                                    <DiceComponent
                                        currentPlayerIdx={currentPlayerIdx}
                                        loggedUserId={loggedUserId}
                                        socket={socket}
                                        id={id}
                                        canUse={!hasPlayerChallenged}
                                        currentPlayerData={playersData[currentPlayerIdx]}
                                        pendingHeroCard={showHeroBoard}
                                        isPlayerChallenger={isPlayerChallenger}
                                        challengeWindowDuration={challengeWindowTime}
                                        isDuel={(matchState === "CHALLENGE_ROLL" && (challengeHero !== "" && challengeOpponent !== "")) || matchState === "WAITING_HERO_ROLL"}
                                    />

                                    {showHeroBoard ? (
                                        <DiceBoardHeroComponent currentPlayerData={playersData[currentPlayerIdx]} />
                                    ) : (
                                        (matchState === "ORDER_SELECTION" || matchState === "CHALLENGE_ROLL") && (
                                            <DiceBoardOrderComponent playersData={playersData} isChallenger={matchState === "CHALLENGE_ROLL"} challengerHero={playersData[challengeHero]} challengerOpponent={playersData[challengeOpponent]} />
                                        )
                                    )}

                                </>

                            ) : (
                                <PartyComponent
                                    isPlayerTurn={isPlayerTurn}
                                    currentPlayerData={playersData[currentPlayerIdx]}
                                    partyLeaderSelection={partyLeaderSelection}
                                    monsterCard={monsterCard}
                                    availablePartyLeaders={availablePartyLeaders}
                                    socket={socket}
                                    id={id}
                                    currentPlayerIdx={currentPlayerIdx}
                                />
                            )
                        ) : null}
                    </div>

                    {!isTransitioning &&
                        <div className='hand-area flex relative row mt-10'>
                            <PlayerInfoComponent currentPlayerData={playersData[currentPlayerIdx]} />
                            <HandComponent
                                currentPlayerData={playersData[currentPlayerIdx]}
                                currentPlayerIdx={currentPlayerIdx}
                                loggedUserId={loggedUserId}
                            />
                        </div>}


                </div>) : (<>
                    {!partyLeaderSelection && (
                        <TurnIndicator playerName={playersData[turn]?.username || "Player"} key={turn} leader={playersData[turn]?.leader || "BARD"} />
                    )}</>)}


        </div>
    );
}

export default InGame;