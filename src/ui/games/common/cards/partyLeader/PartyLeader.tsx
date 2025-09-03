import { Card } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Image } from "@heroui/image";
import ReactDOM from "react-dom";
import bardImg from "../../../../assets/bard.png";
import TiltedCard from "@/components/TiltedCard";
import { useEffect, useState } from "react";

export function PartyLeader({ }) {
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
            <div onClick={handleClick} style={{ display: "inline-block", cursor: "pointer" }}>
                <TiltedCard
                    imageSrc={bardImg}
                    containerHeight="350px"
                    containerWidth="200px"
                    imageHeight="350px"
                    imageWidth="200px"
                    rotateAmplitude={12}
                    scaleOnHover={1.2}
                    showMobileWarning={false}
                    showTooltip={true}
                />
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
                            imageSrc={bardImg}
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
