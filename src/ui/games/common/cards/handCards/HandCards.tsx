import TiltedCard from "@/components/TiltedCard";
import deckCard from "../../../../assets/deck.png";
import heroImg from "../../../../assets/hero.png";
import ReactDOM from "react-dom";
import { useEffect, useState } from "react";
import { useDrag } from "react-dnd";
import { getCardArt } from "@/utils/CardArt";
import './HandCards.css';

export const CARD_TYPE = "TILTED_CARD";

export interface HandCardData {
    id: number;
    cardName?: string;
    heroClass?: string;
    diceValue?: number;
    type?: string;
}

function HandCards({ card, isUserCard, isSelectable, isSelected, onSelect, onDeselect, removalKind}: { card: HandCardData; isUserCard: boolean; isSelectable: boolean; isSelected: boolean; onSelect: () => void; onDeselect: () => void; removalKind?: "stolen" | "discarded" | null; })  {
    const [expanded, setExpanded] = useState(false);
    const art = isUserCard ? (getCardArt(card) || heroImg) : deckCard;

    const isDraggable = card.type !== "MODIFIER";

    const [{ isDragging }, dragRef] = useDrag({
        type: CARD_TYPE,
        item: { id: card.id, isUserCard },
        canDrag: isDraggable,
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
                onClick={!isSelectable ? handleClick : (isSelected ? onDeselect : onSelect)}
                style={{
                    display: "inline-block",
                    cursor: isDragging ? "grabbing" : (isDraggable ? "grab" : "pointer"),
                    opacity: isDragging ? 0.5 : 1,
                    width: "200px",
                    height: "fit-content",
                    boxShadow: isSelected
                        ? "0 0 16px 6px #8a6fc9, 0 0 32px 12px rgba(138, 111, 201, 0.55)"
                        : isSelectable
                            ? "0 0 8px 2px #c0455a"
                            : undefined,
                    boxSizing: "border-box",
                    position: "relative",
                    padding: 0,
                    margin: 0,
                    transition: "box-shadow 0.2s"
                }}
                className={`card-container ${removalKind === "stolen" ? "hand-card-stolen" : ""} ${removalKind === "discarded" ? "hand-card-discarded" : ""} ${!isDraggable ? "card-modifier-locked" : ""}`}
                id={card.id.toString()}

            >
                <TiltedCard
                    imageSrc={art}
                    containerHeight="280px"
                    containerWidth="280px"
                    imageHeight="280px"
                    imageWidth="280px"
                    rotateAmplitude={12}
                    scaleOnHover={1.1}
                    showMobileWarning={false}
                    showTooltip={true}
                />
                {!isDraggable && isUserCard && (
                    <div className="card-modifier-hint">Play during a Modifier window</div>
                )}
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
                            imageSrc={art}
                            containerHeight="80vh"
                            containerWidth="40vw"
                            imageHeight="60vh"
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