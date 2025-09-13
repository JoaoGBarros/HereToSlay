import { classAvatars } from '@/utils/ClassImages';
import './css/TurnIndicator.css';
import { useState } from 'react';


interface TurnIndicatorProps {
    playerName: string;
    leader: string;
}

function TurnIndicator({ playerName, leader }: TurnIndicatorProps) {
    const [slideIn, setSlideIn] = useState(true);

    return (
        <div className="turn-indicator-container" onAnimationEnd={() => setSlideIn(false)}>
            <div className='turn-indicator-background'>
                <div className='turn-indicator-glow flex-row'>
                    <div className='turn-indicator-class'>
                        <img
                            src={classAvatars[leader]}
                            style={{
                                width: "56px",
                                height: "56px",
                                borderRadius: "50%",
                                objectFit: "cover"
                            }}
                        />
                    </div>
                    <h1 className="turn-indicator-text">
                        Turno de {playerName}
                    </h1>
                </div>
            </div>
        </div>
    );
}

export default TurnIndicator;