import { useEffect, useState } from "react";
import Dice from "react-dice-roll";

interface DiceComponentProps {
    currentPlayerIdx: string;
    loggedUserId: string;
    setDiceRolled: (value: boolean) => void;
    socket: React.MutableRefObject<WebSocket | null> | null;
    id: string | undefined;
    currentPlayerData: any;
    pendingHeroCard: boolean;
}


function DiceComponent({ currentPlayerIdx, loggedUserId, setDiceRolled, socket, currentPlayerData, pendingHeroCard, id}: DiceComponentProps) {
    const [dice1Result, setDice1ResultState] = useState<number | null>(null);
    const [dice2Result, setDice2ResultState] = useState<number | null>(null);

    useEffect(() => {
        if (dice1Result !== null && dice2Result !== null) {
            setDiceRolled(true);
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
                    setDice1ResultState(null);
                    setDice2ResultState(null);
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
                    setDice1ResultState(null);
                    setDice2ResultState(null);
                    return;
                }
            }
        }
    }, [dice1Result, dice2Result, socket]);



    return (
        <div className="dice-selection-container justify-center items-center">
            <h2>Role o dado para começar!</h2>
            <div className='dices flex gap-8'>
                <Dice
                    disabled={currentPlayerIdx != loggedUserId}
                    onRoll={(value) => {
                        setDice1ResultState(value);
                        console.log("Dado 1 rolado:", value);
                    }}
                />
                <Dice
                    disabled={currentPlayerIdx != loggedUserId}
                    onRoll={(value) => {
                        setDice2ResultState(value);
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
    );
}
export default DiceComponent;
