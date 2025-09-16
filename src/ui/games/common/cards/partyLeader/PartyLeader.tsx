import { Card } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Image } from "@heroui/image";
import ReactDOM from "react-dom";
import bardImg from "../../../../assets/party-leader/bard.png";
import fighterImg from "../../../../assets/party-leader/fighter.png";
import guardianImg from "../../../../assets/party-leader/guardian.png";
import rangerImg from "../../../../assets/party-leader/ranger.png";
import thiefImg from "../../../../assets/party-leader/thief.png";
import wizImg from "../../../../assets/party-leader/wizard.png";
import TiltedCard from "@/components/TiltedCard";
import { useEffect, useRef, useState } from "react";
import { playClassSound, playSound } from "@/utils/SoundManager/SoundManager";

export function PartyLeader({ leader, isSelectionStage, isPlayerTurn, chooseLeader, className }: { leader: string, isSelectionStage: boolean, isPlayerTurn: boolean, chooseLeader: (leader: string) => void, className?: string }) {
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleCardClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(true);
    };
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

    const handleUse = () => {
        setMenuOpen(false);
        alert("Utilizar ação!");

    };

    const handleChooseLeader = () => {
        if (isSelectionStage) {
            chooseLeader(leader);
        }
    }

    const handleView = (leader: "BARD" | "FIGHTER" | "GUARDIAN" | "RANGER" | "THIEF" | "WIZARD") => {
        setExpanded(true);
        playClassSound(leader);
        setMenuOpen(false);
    };

    const heroCards: Record<string, string> = { "BARD": bardImg, "FIGHTER": fighterImg, "GUARDIAN": guardianImg, "RANGER": rangerImg, "THIEF": thiefImg, "WIZARD": wizImg };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        if (menuOpen) {
            window.addEventListener("mousedown", handleClickOutside);
        }
        return () => window.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    return (
        <>
            <div onClick={handleCardClick} style={{ display: "inline-block", cursor: "pointer", position: "relative" }} className={className}>
                <TiltedCard
                    imageSrc={heroCards[leader]}
                    containerHeight="380px"
                    containerWidth="300px"
                    imageHeight="380px"
                    imageWidth="300px"
                    rotateAmplitude={12}
                    scaleOnHover={1.2}
                    showMobileWarning={false}
                    showTooltip={true}
                />
                {menuOpen && (
                    <div
                        ref={menuRef}
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translateY(-50%)",
                            background: "#fff",
                            border: "1px solid #b48a5a",
                            borderRadius: "8px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            padding: "8px 0",
                            zIndex: 10,
                        }}
                    >
                        <button
                            style={{
                                display: "block",
                                width: "100%",
                                background: "none",
                                border: "none",
                                padding: "8px 16px",
                                textAlign: "left",
                                cursor: "pointer",
                                fontSize: "16px"
                            }}
                            onClick={() => handleView(leader)}
                        >
                            Visualizar
                        </button>
                        <Divider />
                        <button
                            style={{
                                background: !isPlayerTurn ? "#e5e7eb" : "none",
                                color: !isPlayerTurn ? "#888" : "inherit",
                                display: "block",
                                width: "100%",
                                border: "none",
                                padding: "8px 16px",
                                textAlign: "left",
                                cursor: "pointer",
                                fontSize: "16px"
                            }}
                            disabled={!isPlayerTurn}
                            onClick={isSelectionStage ? handleChooseLeader : handleUse}
                        >
                            {isSelectionStage ? "Escolher" : "Utilizar"}
                        </button>
                    </div>
                )}
            </div>
            {expanded &&
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
                            imageSrc={heroCards[leader]}
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
    );
}
