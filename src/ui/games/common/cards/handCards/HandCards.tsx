import TiltedCard from "@/components/TiltedCard";
import heroCard from "../../../../assets/hero.png";
import deckCard from "../../../../assets/deck.png";
import ReactDOM from "react-dom";
import { useEffect, useState } from "react";
import { useDrag } from "react-dnd";

export const CARD_TYPE = "TILTED_CARD";

function HandCards({ card, isUserCard }: { card: { id: number }; isUserCard: boolean })  {
    const [expanded, setExpanded] = useState(false);

    const [{ isDragging }, dragRef] = useDrag({
        type: CARD_TYPE,
        item: { id: card.id, isUserCard },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const handleClick = () => setExpanded(true);
    const handleClose = () => setExpanded(false);

    useEffect(() => {
        if (!expanded) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setExpanded(false);
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [expanded]);

    return (
        <>
            <div
                ref={dragRef}
                onClick={handleClick}
                style={{
                    display: "inline-block",
                    cursor: isDragging ? "grabbing" : "grab",
                    opacity: isDragging ? 0.5 : 1,
                }}
                id={card.id.toString()}
            >
                <TiltedCard
                    imageSrc={isUserCard ? heroCard : deckCard}
                    containerHeight="280px"
                    containerWidth="280px"
                    imageHeight="280px"
                    imageWidth="280px"
                    rotateAmplitude={12}
                    scaleOnHover={1.1}
                    showMobileWarning={false}
                    showTooltip={true}
                />
            </div>

            {expanded && isUserCard &&
                ReactDOM.createPortal(
                    <div
                        onClick={handleClose}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100vw",
                            height: "100vh",
                            background: "rgba(0,0,0,0.7)",
                            zIndex: 9999,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer"
                        }}
                    >
                        <TiltedCard
                            imageSrc={heroCard}
                            containerHeight="80vh"
                            containerWidth="40vw"
                            imageHeight="80vh"
                            imageWidth="40vw"
                            rotateAmplitude={0}
                            scaleOnHover={1}
                            showMobileWarning={false}
                            showTooltip={false}
                        />
                    </div>,
                    document.body
                )
            }
        </>
    )
}

export default HandCards;