import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import TiltedCard from "@/components/TiltedCard";
import heroImg from "../../assets/hero.png";
import { getMonsterArt } from "@/utils/CardArt";
import './css/MonsterComponent.css';

export interface MonsterData {
    id: number;
    name: string;
    partyRequirement: string;
    fightBackThreshold: number;
    slayThreshold: number;
}

function MonsterComponent({ monster, socket, id, isPlayerTurn, matchState }: {
    monster: MonsterData;
    socket: React.MutableRefObject<WebSocket | null> | null;
    id: string | undefined;
    isPlayerTurn: boolean;
    matchState?: string;
}) {
    const [lastRoll, setLastRoll] = useState<number | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const [resultFlash, setResultFlash] = useState<"slain" | "fight-back" | "survives" | null>(null);
    const [expanded, setExpanded] = useState(false);
    const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const art = getMonsterArt(monster.name) || heroImg;

    useEffect(() => {
        if (!socket || !socket.current) return;

        const ws = socket.current;
        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data?.payload?.monsterId !== monster.id) return;

                if (data.type === "animation" && data.subtype === "monster_attack_start") {
                    setIsRolling(true);
                    setLastRoll(null);
                } else if (data.type === "animation" && data.subtype === "monster_slain") {
                    setIsRolling(false);
                    setLastRoll(data.payload.roll);
                    setResultFlash("slain");
                } else if (data.type === "animation" && data.subtype === "monster_fight_back") {
                    setIsRolling(false);
                    setLastRoll(data.payload.roll);
                    setResultFlash("fight-back");
                } else if (data.type === "animation" && data.subtype === "monster_survives") {
                    setIsRolling(false);
                    setLastRoll(data.payload.roll);
                    setResultFlash("survives");
                }
            } catch { }
        };

        ws.addEventListener("message", handleMessage);
        return () => ws.removeEventListener("message", handleMessage);
    }, [socket, monster.id]);

    useEffect(() => {
        if (!resultFlash) return;
        if (flashTimeout.current) clearTimeout(flashTimeout.current);
        flashTimeout.current = setTimeout(() => setResultFlash(null), 900);
        return () => { if (flashTimeout.current) clearTimeout(flashTimeout.current); };
    }, [resultFlash]);

    useEffect(() => {
        if (!expanded) return;
        const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [expanded]);

    const canAttack = isPlayerTurn && (!matchState || matchState === "GAMEPLAY") && !isRolling;

    const attemptSlay = () => {
        if (!socket || !socket.current || !canAttack) return;
        socket.current.send(JSON.stringify({
            type: 'match',
            subtype: 'action',
            action: 'attempt_slay_monster',
            id: id,
            payload: {
                monster_id: monster.id,
            }
        }));
    };

    return (
        <>
            <div className={`battlefield-card-slot monster-slot ${isRolling ? 'monster-card-rolling' : ''} ${resultFlash === 'slain' ? 'monster-card-slain' : ''} ${resultFlash === 'fight-back' ? 'monster-card-fightback' : ''} ${resultFlash === 'survives' ? 'monster-card-survives' : ''}`}>
                <div className="monster-card-inner">
                    <TiltedCard
                        imageSrc={art}
                        containerHeight="380px"
                        containerWidth="300px"
                        imageHeight="auto"
                        imageWidth="300px"
                        rotateAmplitude={10}
                        scaleOnHover={1.06}
                        showMobileWarning={false}
                        showTooltip={false}
                    />
                    <div className="monster-card-tint" />

                    <div className="monster-card-hover-panel">
                        {lastRoll !== null && <div className="monster-last-roll">Rolled {lastRoll}</div>}
                        <div className="monster-card-hover-actions">
                            <button className="monster-view-button" onClick={() => setExpanded(true)}>
                                View
                            </button>
                            <button className="monster-attack-button" disabled={!canAttack} onClick={attemptSlay}>
                                {isRolling ? "Rolling..." : "Attack"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {expanded &&
                ReactDOM.createPortal(
                    <div
                        onClick={() => setExpanded(false)}
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
                        <div style={{ position: "relative" }}>
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
                        </div>
                    </div>,
                    document.body
                )
            }
        </>
    );
}

export default MonsterComponent;
