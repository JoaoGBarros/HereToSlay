import { Card } from "@heroui/card";
import { useState } from "react";
import avatarImg from '../../assets/150.jpg';
import { classAvatars } from "@/utils/ClassImages";

function PlayerInfoComponent({ currentPlayerData }: { currentPlayerData: any }) {

    const [showTooltip, setShowTooltip] = useState(false);

    function handleDiscardAll() {
        console.log("Discard all cards");
    }


    return (
        <Card className='p-10 h-full player-info-card' >
            <div className='player-info h-full content-center flex items-center flex-col gap-10'>
                <div className='discard-all-cards'>
                    <button onClick={handleDiscardAll} className='bg-red-500 text-white px-4 py-2 rounded'>
                        Reset Cards
                    </button>
                </div>
                <div className="avatar-tooltip-wrapper" style={{ position: "relative", display: "inline-block" }}>
                    <img
                        src={currentPlayerData?.leader ? classAvatars[currentPlayerData.leader] : avatarImg}
                        alt="Player"
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #e2b007',
                            background: '#fff',
                            zIndex: 10,
                            marginBottom: '8px'
                        }}
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    />
                    {showTooltip && (
                        <div
                            style={{
                                position: "absolute",
                                top: "100%",
                                left: "50%",
                                transform: "translateX(-50%)",
                                marginBottom: "8px",
                                background: "#fffbe6",
                                color: "#b48a5a",
                                border: "1px solid #e2b007",
                                borderRadius: "8px",
                                padding: "6px 16px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                                fontWeight: "bold",
                                fontSize: "16px",
                                whiteSpace: "nowrap",
                                zIndex: 100,
                            }}
                        >
                            {currentPlayerData?.username}
                        </div>
                    )}
                </div>
                <div className='action-points flex items-center gap-2'>
                    {Array.from({ length: currentPlayerData?.maxAP }).map((_, idx) => (
                        <span
                            key={idx}
                            style={{
                                display: 'inline-block',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: idx < currentPlayerData?.currentAP ? 'gold' : '#bbb',
                                marginLeft: '4px',
                                border: '2px solid #e2b007',
                            }}
                        />
                    ))}
                </div>
            </div>
        </Card>
    );
}

export default PlayerInfoComponent;