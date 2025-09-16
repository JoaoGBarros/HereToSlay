import crownImg from '../../assets/crown.png'
import { classAvatars } from '@/utils/ClassImages';


interface ChallengeRollProps {
    challenger: string;
    opponent: string;
    winnerId?: string | null;
    playersData: any;
}



function ChallengeRoll({ challenger, opponent, winnerId, playersData }: ChallengeRollProps) {
    return (
        <div className="challenge-roll w-full flex items-center h-full">
            <div className="hero bg-blue-600 p-4 rounded-lg flex flex-col items-center w-[50%] h-full">
                <img
                    src={classAvatars[playersData[challenger]?.leader]}
                    alt={playersData[challenger]?.username || 'Challenger'}
                    style={{
                        width: "150px",
                        height: "150px",
                        borderRadius: "50%",
                        objectFit: "cover"
                    }}
                />
            </div>
            <div className="versus absolute z-10 items-center flex justify-center w-full font-bold">VS</div>
            <div className="challenger w-[50%] bg-red-600 p-4 rounded-lg flex flex-col items-center h-full">
                 <img
                    src={classAvatars[playersData[opponent]?.leader]}
                    alt={playersData[opponent]?.username || 'Opponent'}
                    style={{
                        width: "150px",
                        height: "150px",
                        borderRadius: "50%",
                        objectFit: "cover"
                    }}
                />
            </div>
        </div>
    );
}

export default ChallengeRoll;