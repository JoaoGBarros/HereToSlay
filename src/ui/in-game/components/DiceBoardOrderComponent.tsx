import { Card } from "@heroui/card";
import challengeIcon from "../../assets/cards/challenge-icon.png";


type DiceBoardComponentProps = {
    playersData: { [id: string]: any };
    isChallenger?: boolean;
    challengerHero?: { [id: string]: any };
    challengerOpponent?: { [id: string]: any };

};

function DiceBoardOrderComponent({ playersData, isChallenger, challengerHero, challengerOpponent }: DiceBoardComponentProps) {
    const playersArray = Object.values(playersData);
    console.log("Challenger Hero:", challengerHero);
    console.log("Challenger Opponent:", challengerOpponent);
    return (
        <div className="dice-board">
            <Card>
                <div className="dice-board-content p-4">
                    <h3 className="text-lg font-bold mb-2">Dice Results</h3>
                    <ul>
                        {isChallenger ? (<>
                            <li className="mb-2">
                                <span className="font-semibold">{challengerHero?.username}:</span>{" "}
                                <span className="text-2xl">
                                    {challengerHero?.lastRoll !== null ? challengerHero?.lastRoll : '-'}
                                </span>
                            </li>

                            <li className="mb-2">
                                <span className="font-semibold"><img
                                    src={challengeIcon}
                                    alt="Player"
                                    style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '2px solid #e2b007',
                                        background: '#fff',
                                        zIndex: 10,
                                        marginBottom: '8px'
                                    }}
                                />{challengerOpponent?.username}:</span>{" "}
                                <span className="text-2xl">
                                    {challengerOpponent?.lastRoll !== null ? challengerOpponent?.lastRoll : '-'}
                                </span>
                            </li>


                        </>) : (<>
                            {playersArray.map((player: any, idx: number) => (
                                <li key={idx} className="mb-2">
                                    <span className="font-semibold">{player.username}:</span>{" "}
                                    <span className="text-2xl">
                                        {player.orderRoll !== null ? player.orderRoll : '-'}
                                    </span>
                                </li>
                            ))}</>
                        )}
                    </ul>
                </div>
            </Card>
        </div>
    );
}

export default DiceBoardOrderComponent;
