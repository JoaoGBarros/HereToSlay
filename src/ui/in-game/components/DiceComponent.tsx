import { PartyHero } from "@/ui/games/common/cards/partyHero/PartyHero";
import { Card } from "@heroui/card";
import { useEffect, useState } from "react";
import Dice from "react-dice-roll";
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
}


function DiceComponent({ currentPlayerIdx, loggedUserId, socket, currentPlayerData, pendingHeroCard, id, isPlayerChallenger, challengeWindowDuration }: DiceComponentProps) {
    const [dice1Result, setDice1ResultState] = useState<number | null>(null);
    const [dice2Result, setDice2ResultState] = useState<number | null>(null);
    const [isDiceDisabled, setIsDiceDisabled] = useState(false);
    const [challengeWindowTimeRemaining, setChallengeWindowTimeRemaining] = useState<number | undefined>(0);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (socket && socket.current) {
            socket.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'match' && data.subtype === 'timer_update') {
                    setChallengeWindowTimeRemaining(data.payload.remainingTime);
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
    const isChallengeWindowActive = timeRemaining > 0.1;



    return (
        <div className="dice-selection-container justify-center items-center flex w-full">
            {pendingHeroCard && (
                <div className="hero-card-container mr-[200px]">
                    <PartyHero id={currentPlayerData?.pendingHeroCard} />
                </div>
            )}
            <div className='dices flex flex-col justify-center gap-16 w-[50%] relative'>
                {isChallengeWindowActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                        <ChallengeButton progress={progress} timeRemaining={timeRemaining} socket={socket} id={id} />
                    </div>
                )}
                <div className='flex flex-row justify-center gap-16'>
                    <div onClick={() => { if (!isChallengeWindowActive) playSound('diceRoll') }}>
                        <Dice
                            size={200}
                            disabled={(currentPlayerIdx != loggedUserId && !isPlayerChallenger) || isChallengeWindowActive}
                            onRoll={(value) => {
                                setDice1ResultState(value);
                            }}
                        />

                    </div>

                    <div onClick={() => { if (!isChallengeWindowActive) playSound('diceRoll') }}>
                        <Dice
                            size={200}
                            disabled={(currentPlayerIdx != loggedUserId && !isPlayerChallenger) || isChallengeWindowActive}
                            onRoll={(value) => {
                                setDice2ResultState(value);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
export default DiceComponent;
