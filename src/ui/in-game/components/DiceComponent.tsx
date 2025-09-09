import { PartyHero } from "@/ui/games/common/cards/partyHero/PartyHero";
import { Card } from "@heroui/card";
import { useEffect, useState } from "react";
import Dice from "react-dice-roll";

interface DiceComponentProps {
    currentPlayerIdx: string;
    loggedUserId: string;
    socket: React.MutableRefObject<WebSocket | null> | null;
    id: string | undefined;
    currentPlayerData: any;
    pendingHeroCard: boolean;
}


function DiceComponent({ currentPlayerIdx, loggedUserId, socket, currentPlayerData, pendingHeroCard, id }: DiceComponentProps) {
    const [dice1Result, setDice1ResultState] = useState<number | null>(null);
    const [dice2Result, setDice2ResultState] = useState<number | null>(null);
    const [isDiceDisabled, setIsDiceDisabled] = useState(false);

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
            }
        }
    }, [dice1Result, dice2Result, socket]);



    return (
        <div className="dice-selection-container justify-center items-center flex w-full">
            {pendingHeroCard && (
                <div className="hero-card-container mr-[300px]">
                    <PartyHero id={currentPlayerData?.pendingHeroCard} />
                </div>
            )}
            <div className='dices flex gap-16 w-[50%]'>
                <Dice
                    size={200}
                    disabled={currentPlayerIdx != loggedUserId}
                    onRoll={(value) => {
                        setDice1ResultState(value);
                        console.log("Dado 1 rolado:", value);
                    }}
                />
                <Dice
                    size={200}
                    disabled={currentPlayerIdx != loggedUserId}
                    onRoll={(value) => {
                        setDice2ResultState(value);
                        console.log("Dado 2 rolado:", value);
                    }}
                />
            </div>
        </div>
    );
}
export default DiceComponent;
