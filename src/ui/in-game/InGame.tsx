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
import OrderSelectionScoreboard from './components/OrderSelectionScoreboard';
import ChallengeRoll from './components/ChallengeRoll';
import crownImg from '../assets/crown.png'
import { classAvatars } from '@/utils/ClassImages';

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
    const [playersRolls, setPlayersRolls] = useState<{ [playerId: string]: number | null }>({});
    const [isDiceRollVisible, setIsDiceRollVisible] = useState(true);
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const [showChallengeButton, setShowChallengeButton] = useState(false);
    const [showHeroBoard, setShowHeroBoard] = useState(false);
    const [showHeroRollWaiting, setShowHeroRollWaiting] = useState(false);
    const [showChallenge, setShowChallenge] = useState(false);
    const [showChallengeResult, setShowChallengeResult] = useState(false);
    const [challengeRolls, setChallengeRolls] = useState<{ [playerId: string]: number | null }>({});


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
        { id: 1, name: "Goblin" },
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
                        setAvailablePartyLeaders(data.payload.availablePartyLeaders || []);
                        setChallengeWindowTime(data.payload.challengeWindowTime || 0);
                        setHasPlayerChallenged((data.payload.challengerSet || []).includes(loggedUserId));
                    } else if (data.subtype === 'order_selection_tie') {
                        setPlayersData(data.payload.players);
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
                        setWinnerId(data.winner);
                    }
                }

                if (data.type === 'sound' && data.subtype === 'play_class_sound') {
                    console.log("Play class sound:", data.payload);
                    const className = data.payload as ClassSoundType;
                    if (className) {
                        playClassSound(className);
                    }
                }

                if (data.type === 'roll_result' && data.subtype === 'duel_roll') {
                    setShowChallengeResult(true);
                    setChallengeRolls(data.payload);
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

        const needsToRollForOrder = matchState === "ORDER_SELECTION" && player.lastRoll === null;
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
            setShowTurnIndicator(false);
            setPendingTurn(turn);
            setTimeout(() => {
                if (autoSwitchView) {
                    setCurrentPlayerIdx(turn);
                    setCurrentPlayerData(playersData[turn]);
                }

                setIsTransitioning(false);
                if (matchState !== "PARTY_LEADER_SELECTION") {
                    setShowTurnIndicator(true);
                    setTimeout(() => setShowTurnIndicator(false), 1000);
                }
            }, 1500);
            setIsPlayerTurn(turn === loggedUserId);
        }
    }, [turn]);

    useEffect(() => {

        if (matchState === "PARTY_LEADER_SELECTION") {
            setDiceRolled((prev) => ({ ...prev, [currentPlayerIdx]: true }));

            setTimeout(() => {
                setPartyLeaderSelection(true);
                setIsDiceRollVisible(false);
            }, 1000);
        }


    }, [matchState]);

    useEffect(() => {
        if (matchState == "GAMEPLAY") {
            setPartyLeaderSelection(false);
            setAvailablePartyLeaders([]);
            setDiceRolled((prev) => ({ ...prev, [currentPlayerIdx]: true }));
            setTimeout(() => setIsDiceRollVisible(false), 2000);
            if (Object.keys(challengeRolls).length !== 0) {
                setTimeout(() => {
                    setShowChallenge(false);
                    setChallengeRolls({})
                }, 5000);
            }
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
            setShowChallenge(true);
            setShowChallengeResult(false);
            setWinnerId(null);
            setIsDiceRollVisible(currentPlayerIdx === challengeHero || currentPlayerIdx === challengeOpponent);
        }
    }, [currentPlayerIdx, challengeHero, challengeOpponent, matchState, loggedUserId]);

    useEffect(() => {
        if (matchState === "WAITING_HERO_ROLL") {
            setIsPlayerChallenger(false);
            setChallengeHero("");
            setIsDiceRollVisible(true);
            setChallengeOpponent("");
            if (Object.keys(challengeRolls).length !== 0) {
                setTimeout(() => {
                    setShowChallenge(false);
                    setChallengeRolls({})
                }, 2000);
            }
        }
    }, [matchState, challengeHero, challengeOpponent]);



    useEffect(() => {
        if (matchState === "CHALLENGE_WINDOW") {
            setIsDiceRollVisible(false);
            setShowChallengeResult(false);
            if (Object.keys(challengeRolls).length !== 0) {
                setTimeout(() => {
                    setShowChallenge(false);
                    setChallengeRolls({})
                }, 2000);
            }
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
                        {!showTurnIndicator && (
                            !diceRolled[currentPlayerIdx] || isDiceRollVisible ? (
                                showChallenge ? (
                                    // Challenge view
                                    <>
                                        <div className="challenge-roll w-full flex items-center h-full relative">
                                            <div className="hero bg-blue-600 p-4 rounded-lg flex flex-col items-center w-[50%] h-full z-10">
                                                <div className='player-info flex items-center flex-col'>
                                                    <img
                                                        src={classAvatars[playersData[challengeHero]?.leader]}
                                                        alt={playersData[challengeHero]?.username || 'Challenger'}
                                                        style={{
                                                            width: "150px",
                                                            height: "150px",
                                                            borderRadius: "50%",
                                                            objectFit: "cover"
                                                        }}
                                                    />
                                                    <div className='flex items-center mt-2'>
                                                        <span className='text-white font-bold text-2xl mr-2'>{playersData[challengeHero]?.username || 'Hero'}</span>
                                                        {winnerId === challengeHero && (<img
                                                            src={crownImg}
                                                            style={{
                                                                width: "70px",
                                                                height: "70px",
                                                                borderRadius: "50%",
                                                            }}
                                                            className='crown-slide-in'
                                                        />)}</div>
                                                </div>
                                                {!challengeRolls[challengeHero] ? (
                                                    <div className='challenge-dice mt-20 w-full flex justify-center items-center h-fit'>
                                                        <DiceComponent
                                                            currentPlayerIdx={challengeHero}
                                                            loggedUserId={loggedUserId}
                                                            socket={socket}
                                                            id={id}
                                                            isDiceRollVisible={true}
                                                            canUse={loggedUserId === challengeHero}
                                                            currentPlayerData={playersData[challengeHero]}
                                                            pendingHeroCard={showHeroBoard}
                                                            isPlayerChallenger={isPlayerChallenger}
                                                            challengeWindowDuration={challengeWindowTime}
                                                            isDuel={(matchState === "CHALLENGE_ROLL" && (challengeHero !== "" && challengeOpponent !== "")) || matchState === "WAITING_HERO_ROLL"}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className='mt-30 text-white font-bold text-5xl'>
                                                        {`${challengeRolls[challengeHero]}`}
                                                    </div>
                                                )}

                                            </div>
                                            <div className="challenger w-[50%] bg-red-600 p-4 rounded-lg flex flex-col items-center h-full z-10">
                                                <div className='player-info flex items-center flex-col'>
                                                    <img
                                                        src={classAvatars[playersData[challengeOpponent]?.leader]}
                                                        alt={playersData[challengeOpponent]?.username || 'Opponent'}
                                                        style={{
                                                            width: "150px",
                                                            height: "150px",
                                                            borderRadius: "50%",
                                                            objectFit: "cover"
                                                        }}
                                                    />
                                                    <div className='flex items-center mt-2'>
                                                        <span className='text-white font-bold text-2xl mr-2'>{playersData[challengeOpponent]?.username || 'Hero'}</span>
                                                        {winnerId === challengeOpponent && (<img
                                                            src={crownImg}
                                                            style={{
                                                                width: "70px",
                                                                height: "70px",
                                                                borderRadius: "50%",
                                                            }}
                                                            className='crown-slide-in'
                                                        />)}</div>
                                                </div>

                                                {!challengeRolls[challengeOpponent] ? (
                                                    <div className='challenge-dice mt-20 w-full flex justify-center items-center'>
                                                        <DiceComponent
                                                            currentPlayerIdx={challengeOpponent}
                                                            loggedUserId={loggedUserId}
                                                            socket={socket}
                                                            id={id}
                                                            isDiceRollVisible={true}
                                                            canUse={loggedUserId === challengeOpponent}
                                                            currentPlayerData={playersData[challengeOpponent]}
                                                            pendingHeroCard={showHeroBoard}
                                                            isPlayerChallenger={isPlayerChallenger}
                                                            challengeWindowDuration={challengeWindowTime}
                                                            isDuel={(matchState === "CHALLENGE_ROLL" && (challengeHero !== "" && challengeOpponent !== "")) || matchState === "WAITING_HERO_ROLL"}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className='mt-30 text-white font-bold text-5xl'>
                                                        {`${challengeRolls[challengeOpponent]}`}
                                                    </div>
                                                )}

                                            </div>
                                            <div className="versus absolute z-20 items-center flex justify-center w-full font-bold text-9x1"
                                                style={{ top: '50%', left: 0, transform: 'translateY(-50%)' }}>
                                                VS
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    // Normal view
                                    <>
                                        <DiceComponent
                                            currentPlayerIdx={currentPlayerIdx}
                                            loggedUserId={loggedUserId}
                                            socket={socket}
                                            id={id}
                                            isDiceRollVisible={isDiceRollVisible && matchState === "ORDER_SELECTION"}
                                            canUse={!hasPlayerChallenged}
                                            currentPlayerData={playersData[currentPlayerIdx]}
                                            pendingHeroCard={showHeroBoard}
                                            isPlayerChallenger={isPlayerChallenger}
                                            challengeWindowDuration={challengeWindowTime}
                                            isDuel={(matchState === "CHALLENGE_ROLL" && (challengeHero !== "" && challengeOpponent !== "")) || matchState === "WAITING_HERO_ROLL"}
                                        />

                                        {isDiceRollVisible && matchState === "ORDER_SELECTION" && (
                                            <OrderSelectionScoreboard playersData={playersData} />
                                        )}
                                    </>
                                )
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
                        )}
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