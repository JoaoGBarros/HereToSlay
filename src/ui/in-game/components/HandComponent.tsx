import HandCards from "@/ui/games/common/cards/handCards/HandCards";

interface HandComponentProps {
    currentPlayerData: any;
    currentPlayerIdx: string;
    loggedUserId: string;
}

function HandComponent({ currentPlayerData, currentPlayerIdx, loggedUserId }: HandComponentProps) {

    function handleOnDrag(e: React.DragEvent) {
        e.dataTransfer.effectAllowed = "move";
        console.log("drag");
        e.dataTransfer.setData("cardId", e.currentTarget.id);
    }

    return (
        <div className='hand-cards'>
            {currentPlayerData && currentPlayerData.hand ? (
                currentPlayerData.hand.map((card: any, idx: any) => {
                    const total = currentPlayerData.hand.length;
                    const spread = 15;
                    const start = -spread / 2;
                    const angle = start + (spread / (total - 1 || 1)) * idx;
                    const scale = total > 13 ? Math.max(0.4, 1 - 0.05 * (total - 13)) : 1;
                    const baseSpacing = 120;
                    const spacing = total > 7 ? baseSpacing * Math.max(0.4, 1 - 0.04 * (total - 7)) : baseSpacing;
                    console.log({ card, idx });
                    return (
                        <div
                            draggable
                            id={idx.toString()}
                            key={card.cardId + "-" + idx}
                            style={{
                                position: "absolute",
                                left: `calc(50% - 120px)`,
                                bottom: "0",
                                transform: `translateX(${(idx - total / 2) * spacing}px) rotate(${angle}deg) scale(${scale})`,
                                zIndex: idx,
                                transition: "transform 0.2s",
                            }}
                        >
                            <HandCards onDrag={handleOnDrag} card={{ id: card.cardId }} isUserCard={currentPlayerIdx === loggedUserId} />
                        </div>
                    );
                })
            ) : (
                <button
                    className="bg-yellow-400 text-brown-800 px-6 py-3 rounded font-bold shadow"
                    style={{
                        position: "absolute",
                        left: "50%",
                        bottom: "30px",
                        transform: "translateX(-50%)",
                        zIndex: 20,
                    }}
                >
                    Mostrar minhas cartas
                </button>
            )}
        </div>
    );
}

export default HandComponent;