import { PartyHero } from "@/ui/games/common/cards/partyHero/PartyHero";
import { Card } from "@heroui/card";
import { use, useEffect, useState } from "react";
import { Die, useDie } from "react-dice-3d";
import { playSound } from '@/utils/SoundManager/SoundManager';
import ChallengeButton from "./ChallengeButton";

interface DiceComponentProps {
    currentPlayerIdx: string;
    loggedUserId: string;
    socket: React.MutableRefObject<WebSocket | null> | null;
    id: string | undefined;
    currentPlayerData: any;
    pendingHeroCard: boolean;
    isPlayerChallenger: boolean;
    challengeWindowDuration?: number;
    isDuel: boolean;
    canUse: boolean;
    isDiceRollVisible: boolean;
}


function DiceComponent({ currentPlayerIdx, loggedUserId, socket, currentPlayerData, pendingHeroCard, id, isPlayerChallenger, challengeWindowDuration, isDuel, canUse, isDiceRollVisible }: DiceComponentProps) {
    const [dice1Result, setDice1ResultState] = useState<number | null>(null);
    const [dice2Result, setDice2ResultState] = useState<number | null>(null);
    const [isDiceDisabled, setIsDiceDisabled] = useState(false);
    const [challengeWindowTimeRemaining, setChallengeWindowTimeRemaining] = useState<number | undefined>(0);
    const [progress, setProgress] = useState(100);
    const [showResult, setShowResult] = useState(false);
    const [rolledValue, setRolledValue] = useState<number | null>(null);
    const [minValue, setMinValue] = useState<number | null>(null);

    useEffect(() => {
        if (socket && socket.current) {
            socket.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'match' && data.subtype === 'timer_update') {
                    setChallengeWindowTimeRemaining(data.payload.remainingTime);
                }

                if (data.type === 'dice_roll' && data.subtype === 'hero_roll') {
                    console.log('Received hero roll:', data.diceRoll);
                    setRolledValue(data.diceRoll);
                    setMinValue(data.minValue);
                    setShowResult(true);
                    setTimeout(() => setShowResult(false), 2000);
                }

            };
        }
    }, [socket]);


    useEffect(() => {
        if (challengeWindowDuration && challengeWindowTimeRemaining) {
            const totalDuration = challengeWindowDuration * 1000;
            const percentage = (challengeWindowTimeRemaining / challengeWindowDuration) * 100;
            setProgress(percentage);
        } else {
            setProgress(0);
        }
    }, [challengeWindowTimeRemaining, challengeWindowDuration]);



    useEffect(() => {
        if (dice1Result !== null && dice2Result !== null) {

            if (socket && socket.current) {
                if (currentPlayerData?.orderRoll === null) {
                    socket.current.send(JSON.stringify({
                        type: 'match',
                        subtype: 'order_selection',
                        id: id,
                        payload: {
                            roll: dice1Result + dice2Result,
                        }
                    }));
                    setIsDiceDisabled(true);
                    return;
                }

                if (pendingHeroCard) {
                    socket.current.send(JSON.stringify({
                        type: 'match',
                        subtype: 'action',
                        action: 'process_hero_roll',
                        id: id,
                        payload: {
                            roll: dice1Result + dice2Result,
                        }
                    }));
                    setIsDiceDisabled(true);
                    return;
                }

                if (isPlayerChallenger) {
                    socket.current.send(JSON.stringify({
                        type: 'match',
                        subtype: 'process_challenge_roll',
                        id: id,
                        payload: {
                            roll: dice1Result + dice2Result,
                        }
                    }));
                    setIsDiceDisabled(true);
                    return;
                }


            }
        }
    }, [dice1Result, dice2Result, socket]);


    const timeRemaining = (challengeWindowTimeRemaining ?? 0) / 1000;
    const isChallengeWindowActive = isDuel ? false : timeRemaining > 0.1;

    const areDiceDisabled = ((currentPlayerIdx != loggedUserId) && !isPlayerChallenger) || !canUse || isChallengeWindowActive;
    const dice1 = useDie("dice-1");
    const dice2 = useDie("dice-2");


    return (
        <div className="dice-selection-container justify-center items-center flex" style={{ width: isDiceRollVisible ? '70%' : '100%' }}>
            {(pendingHeroCard || showResult) && (
                <div className="hero-card-container mr-[200px] mb-[100px] party-hero-slide-in flex flex-col items-center">
                    <PartyHero id={currentPlayerData?.pendingHeroCard} height={350} width={350} />
                </div>
            )}
            <div className={
                'dices flex flex-col justify-center gap-16 w-[50%] relative dice-slide-in ' +
                (isDiceRollVisible ? 'slide-center' : 'slide-left')
            }>
                {isChallengeWindowActive && (
                    <div className={`absolute inset-0 flex flex-col items-center justify-center z-20`}>
                        <ChallengeButton progress={progress} timeRemaining={timeRemaining} socket={socket} id={id} canUse={canUse} />
                    </div>
                )}
                <div className='flex flex-row justify-center gap-16'>

                    {showResult && rolledValue !== null ?
                        (<>
                            <div className="text-4xl font-bold text-white mt-4">
                                {`${rolledValue} ${minValue ? `(Min: ${minValue})` : ''}`}
                            </div>

                        </>) :
                        <>

                            <div style={{ pointerEvents: areDiceDisabled ? 'none' : 'auto', opacity: areDiceDisabled ? 0.5 : 1 }}>
                                <Die
                                    id="dice-1"
                                    size={150}
                                    onRoll={(value) => {
                                        setDice1ResultState(value);
                                    }}

                                    onClick={(roll) => {
                                        if (!areDiceDisabled) {
                                            playSound('diceRoll')
                                            roll()
                                        }
                                    }}
                                />
                            </div>

                            <div style={{ pointerEvents: areDiceDisabled ? 'none' : 'auto', opacity: areDiceDisabled ? 0.5 : 1 }}>
                                <Die
                                    id="dice-2"
                                    size={150}
                                    onRoll={(value) => {

                                        setDice2ResultState(value);

                                    }}
                                    onClick={(roll) => {
                                        if (!areDiceDisabled) {
                                            playSound('diceRoll')
                                            roll()
                                        }
                                    }}
                                />
                            </div>
                        </>
                    }

                </div>
            </div>
        </div>
    );
}
export default DiceComponent;
