import { Card } from "@heroui/card";
import { useState } from "react";
import avatarImg from '../../assets/150.jpg';
import { classAvatars } from "@/utils/ClassImages";
import './css/PlayerInfoComponent.css';

function PlayerInfoComponent({ currentPlayerData }: { currentPlayerData: any }) {

    const [showTooltip, setShowTooltip] = useState(false);

    function handleDiscardAll() {
        console.log("Discard all cards");
    }


    return (
        <Card className='p-10 h-full player-info-card' >
            <div className='player-info h-full content-center flex items-center flex-col gap-5'>
                <div className='discard-all-cards'>
                    <button onClick={handleDiscardAll} className='player-info-discard-btn'>
                        Reset Cards
                    </button>
                </div>
                <div className="avatar-tooltip-wrapper" style={{ position: "relative", display: "inline-block" }}>
                    <img
                        src={currentPlayerData?.leader ? classAvatars[currentPlayerData.leader] : avatarImg}
                        alt="Player"
                        className="player-info-avatar"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    />
                    {showTooltip && (
                        <div className="gm-tooltip">
                            {currentPlayerData?.username}
                        </div>
                    )}
                </div>
                <div className='ap-indicator'>
                    <span className='ap-indicator-label'>
                        AP {currentPlayerData?.currentAP ?? 0}/{currentPlayerData?.maxAP ?? 0}
                    </span>
                    <div className='ap-indicator-gems'>
                        {Array.from({ length: currentPlayerData?.maxAP || 0 }).map((_, idx) => (
                            <span
                                key={idx}
                                className={`ap-gem ${idx < currentPlayerData?.currentAP ? 'ap-gem-full' : 'ap-gem-empty'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default PlayerInfoComponent;
