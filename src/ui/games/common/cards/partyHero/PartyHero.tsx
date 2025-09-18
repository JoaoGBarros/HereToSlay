import TiltedCard from "@/components/TiltedCard";
import heroImg from "../../../../assets/hero.png";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Divider } from "@heroui/divider";
import './PartyHero.css';

export function PartyHero({
    id, height, width, handleCardUse, isPlayerTurn,
    isSelectable = false, isSelected = false, onSelect, onDeselect
}: {
    id: number,
    height?: number,
    width?: number,
    handleCardUse: (id: number) => void,
    isPlayerTurn: boolean,
    isSelectable?: boolean,
    isSelected?: boolean,
    onSelect?: () => void,
    onDeselect?: () => void
}) {

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
        handleCardUse(id);
    };

    const handleSelect = () => {
        setMenuOpen(false);
        if (onSelect) onSelect();
    };

    const handleDeselect = () => {
        setMenuOpen(false);
        if (onDeselect) onDeselect();
    };

    const handleView = () => {
        setExpanded(true);
        setMenuOpen(false);
    };

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
            <div
                onClick={handleCardClick}
                style={{
                    display: "inline-block",
                    cursor: "pointer",
                    width: width ? `${width}px` : "200px",
                    height: height ? `${height}px` : "280px",
                    boxShadow: isSelected
                        ? "0 0 16px 6px #42a5f5, 0 0 32px 12px #90caf9"
                        : isSelectable
                            ? "0 0 8px 2px #e53935"
                            : undefined,
                    boxSizing: "border-box",
                    position: "relative",
                    padding: 0,
                    margin: 0,
                    transition: "box-shadow 0.2s"
                }}
                className="relative"
            >
                <TiltedCard
                    imageSrc={heroImg}
                    containerHeight="fit-content"
                    containerWidth="fit-content"
                    imageHeight={`${height || 280}px`}
                    imageWidth={`${width || 250}px`}
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
                            minWidth: "120px"
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
                            onClick={handleView}
                        >
                            Visualizar
                        </button>
                        <Divider />
                        {isSelectable ? (
                            isSelected ? (
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
                                    onClick={handleDeselect}
                                >
                                    Remover seleção
                                </button>
                            ) : (
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
                                    onClick={handleSelect}
                                >
                                    Escolher
                                </button>
                            )
                        ) : (
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
                                disabled={!isPlayerTurn}
                                onClick={handleUse}
                            >
                                Utilizar
                            </button>
                        )}
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
                            imageSrc={heroImg}
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
