import { Card } from "@heroui/card";

interface DiceBoardHeroComponentProps {
    currentPlayerData: any;
};

function DiceBoardHeroComponent({ currentPlayerData }: { currentPlayerData: any }) {
    return (
        <div className="dice-board-hero">
            <Card>
                <div className="dice-board-content p-4">
                    <h3 className="text-lg font-bold mb-2">Dice Results</h3>
                    <ul>
                        <li className="mb-2">
                            <span className="font-semibold">{currentPlayerData.username}:</span>{" "}
                            <span className="text-2xl">
                                {currentPlayerData.lastRoll !== null ? currentPlayerData.lastRoll : '-'}
                            </span>
                        </li>
                    </ul>
                </div>
            </Card>
        </div>
    );
}
export default DiceBoardHeroComponent;