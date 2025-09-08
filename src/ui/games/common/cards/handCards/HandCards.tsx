import TiltedCard from "@/components/TiltedCard";
import heroCard from "../../../../assets/hero.png";
import deckCard from "../../../../assets/deck.png";
import ReactDOM from "react-dom";
import { useEffect, useState } from "react";

function HandCards({ onDrag, card, isUserCard }: { onDrag: (e: React.DragEvent) => void; card: { id: number }; isUserCard: boolean })  {

    const [expanded, setExpanded] = useState(false);

    const handleClick = () => setExpanded(true);
    const handleClose = () => setExpanded(false);

    useEffect(() => {
        if (!expanded) return;

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setExpanded(false);
            }
        };

        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [expanded]);

    return (
        <>
            <div onClick={handleClick} style={{ display: "inline-block", cursor: "pointer" }} draggable onDragStart={(e) => onDrag(e)} id={card.id.toString()}>
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