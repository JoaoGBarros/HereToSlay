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
                <span className="turn-indicator-rule turn-indicator-rule-top" />
                <div className='turn-indicator-glow flex-row'>
                    <div className='turn-indicator-class mr-20'>
                        <img
                            src={classAvatars[leader]}
                            className="turn-indicator-avatar"
                        />
                    </div>
                    <h1 className="turn-indicator-text">
                        {playerName}'s Turn
                    </h1>
                </div>
                <span className="turn-indicator-rule turn-indicator-rule-bottom" />
            </div>
        </div>
    );
}

export default TurnIndicator;