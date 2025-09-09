import { Card } from "@heroui/card";


type DiceBoardComponentProps = {
    playersData: { [id: string]: any };
};

function DiceBoardOrderComponent({ playersData }: DiceBoardComponentProps) {
    const playersArray = Object.values(playersData);
    return (
        <div className="dice-board">
            <Card>
                <div className="dice-board-content p-4">
                    <h3 className="text-lg font-bold mb-2">Dice Results</h3>
                    <ul>
                        {playersArray.map((player: any, idx: number) => (
                            <li key={idx} className="mb-2">
                                <span className="font-semibold">{player.username}:</span>{" "}
                                <span className="text-2xl">
                                    {player.orderRoll !== null ? player.orderRoll : '-'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </Card>
        </div>
    );
}

export default DiceBoardOrderComponent;
