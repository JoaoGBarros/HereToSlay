import challengeIcon from "../../assets/cards/challenge-icon.png";
import ElectricBorder from '../../../components/ElectricBorder';
import GlareHover from "@/components/GlareHover";

interface ChallengeButtonProps {
    socket: React.MutableRefObject<WebSocket | null> | null;
    id: string | undefined;
    progress: number;
    timeRemaining: number;
    canUse: boolean;
}

function ChallengeButton({ socket, id, progress, timeRemaining, canUse }: ChallengeButtonProps) {
    const conicGradient = `conic-gradient( #1100ffff ${progress * 3.6}deg, transparent ${progress * 3.6}deg)`;
    if (timeRemaining <= 0.1) {
        timeRemaining = 0;
    }


    function handleChallengeClick() {
        console.log("Challenge button clicked");
        if (socket && socket.current) {
            socket.current.send(JSON.stringify({
                type: 'match',
                subtype: 'challenge',
                id: id
            }));
        }
    }

    return (
        <div className="challenge-button-container flex flex-col items-center justify-center">

            <button onClick={handleChallengeClick}>
                <ElectricBorder
                    color="#035bffd8"
                    speed={0.7}
                    chaos={1.5}
                    thickness={7}
                    style={{ borderRadius: '100%' }}>
                    <div
                        className="challenge-button-icon p-1"
                        style={{
                            width: '220px',
                            height: '220px',
                            borderRadius: '50%',
                            background: conicGradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.1s linear'
                        }}
                    >

                        <img
                            src={challengeIcon}
                            alt="Player"
                            style={{
                                width: '200px',
                                height: '200px',
                                borderRadius: '50%',
                                objectFit: 'contain',
                                background: '#fff',
                                zIndex: 10,
                            }}
                            className={canUse ? '' : 'grayscale'}
                        />

                    </div>
                </ElectricBorder>
            </button>
            {timeRemaining > 0 && (
                <p className="text-center mt-2 text-white">{`Tempo restante: ${timeRemaining.toFixed(1)}s`}</p>
            )}
        </div>
    );
}
export default ChallengeButton;