import challengeIcon from "../../assets/cards/challenge-icon.png";
import ElectricBorder from '../../../components/ElectricBorder';
import GlareHover from "@/components/GlareHover";
import { useState } from "react";

interface ChallengeButtonProps {
    socket: React.MutableRefObject<WebSocket | null> | null;
    id: string | undefined;
    progress: number;
    timeRemaining: number;
    canUse: boolean;
}

function ChallengeButton({ socket, id, progress, timeRemaining, canUse }: ChallengeButtonProps) {
    const conicGradient = `conic-gradient( #d1a441 ${progress * 3.6}deg, transparent ${progress * 3.6}deg)`;
    if (timeRemaining <= 0.1) {
        timeRemaining = 0;
    }

    const [showTooltip, setShowTooltip] = useState(false);


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
                    color="#d1a441d8"
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
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                        />


                    </div>
                </ElectricBorder>
            </button>

            {showTooltip && (
                <div className="gm-tooltip" style={{ position: "absolute", bottom: "100%", marginBottom: "8px" }}>
                    {canUse ? "Challenge this hero" : "You already challenged this window"}
                </div>
            )}
            {timeRemaining > 0 && (
                <p className="text-center mt-2" style={{ color: 'var(--gm-parchment)', fontFamily: 'var(--gm-font-ui)' }}>{`Time left: ${timeRemaining.toFixed(1)}s`}</p>
            )}
        </div>
    );
}
export default ChallengeButton;