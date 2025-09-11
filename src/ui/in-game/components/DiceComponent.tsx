import { PartyHero } from "@/ui/games/common/cards/partyHero/PartyHero";
import { Card } from "@heroui/card";
import { useEffect, useState } from "react";
import Dice from "react-dice-roll";
import { playSound } from '@/utils/SoundManager/SoundManager';

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



    return (
        <div className="dice-selection-container justify-center items-center flex w-full">
            {pendingHeroCard && (
                <div className="hero-card-container mr-[300px]">
                    <PartyHero id={currentPlayerData?.pendingHeroCard} />
                </div>
            )}
            <div className='dices flex flex-col justify-center gap-16 w-[50%]'>
                <div className='flex flex-row justify-center gap-16'>
                    <div onClick={() => { playSound('diceRoll') }}>
                        <Dice
                            size={200}
                            disabled={(currentPlayerIdx != loggedUserId && !isPlayerChallenger)}
                            onRoll={(value) => {
                                setDice1ResultState(value);
                            }}
                        />

                    </div>

                    <div onClick={() => { playSound('diceRoll') }}>
                        <Dice
                            size={200}
                            disabled={(currentPlayerIdx != loggedUserId && !isPlayerChallenger)}
                            onRoll={(value) => {
                                setDice2ResultState(value);
                            }}
                        />
                    </div>
                </div>

                {challengeWindowDuration! > 0 && pendingHeroCard && challengeWindowTimeRemaining! > 0 && (
                    <div className="w-1/2 mb-4">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.floor((challengeWindowTimeRemaining! / 1000) / challengeWindowDuration! * 100).toFixed(1)}%`, transition: 'width 1s linear' }}></div>
                        </div>
                        <p className="text-center mt-2">{`Tempo restante: ${Math.floor(challengeWindowTimeRemaining! / 1000).toFixed(1)}s`}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
export default DiceComponent;
