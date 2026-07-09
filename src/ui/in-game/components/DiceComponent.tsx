import { PartyHero } from "@/ui/games/common/cards/partyHero/PartyHero";
import { useEffect, useState } from "react";
import { Die, useDie } from "react-dice-3d";
import { playSound } from '@/utils/SoundManager/SoundManager';
import ChallengeButton from "./ChallengeButton";
import type { MonsterData } from "./MonsterComponent";
import TiltedCard from "@/components/TiltedCard";
import heroImg from "../../assets/hero.png";
import { getMonsterArt } from "@/utils/CardArt";

interface DiceComponentProps {
    currentPlayerIdx: string;
    loggedUserId: string;
    socket: React.MutableRefObject<WebSocket | null> | null;
    id: string | undefined;
    currentPlayerData: any;
    pendingHeroCard: boolean;
    isPlayerChallenger: boolean;
    challengeWindowDuration?: number;
    isDuel: boolean;
    canUse: boolean;
    isDiceRollVisible: boolean;
    isMonsterRoll?: boolean;
    monster?: MonsterData | null;
    playersData?: Record<string, any>;
}


function DiceComponent({ currentPlayerIdx, loggedUserId, socket, currentPlayerData, pendingHeroCard, id, isPlayerChallenger, challengeWindowDuration, isDuel, canUse, isDiceRollVisible, isMonsterRoll, monster, playersData }: DiceComponentProps) {
    const [dice1Result, setDice1ResultState] = useState<number | null>(null);
    const [dice2Result, setDice2ResultState] = useState<number | null>(null);
    const [isDiceDisabled, setIsDiceDisabled] = useState(false);
    const [challengeWindowTimeRemaining, setChallengeWindowTimeRemaining] = useState<number | undefined>(0);
    const [progress, setProgress] = useState(100);
    const [showResult, setShowResult] = useState(false);
    const [rolledValue, setRolledValue] = useState<number | null>(null);
    const [minValue, setMinValue] = useState<number | null>(null);
    const [lastPendingHeroCard, setLastPendingHeroCard] = useState<any>(null);
    const [collectedModifiers, setCollectedModifiers] = useState<{ label: string; value: number }[]>([]);

    useEffect(() => {
        if (currentPlayerData?.pendingHeroCard) {
            setLastPendingHeroCard(currentPlayerData.pendingHeroCard);
        }
    }, [currentPlayerData?.pendingHeroCard]);

    useEffect(() => {
        setCollectedModifiers([]);
    }, [currentPlayerIdx, pendingHeroCard, isPlayerChallenger, isMonsterRoll]);

    useEffect(() => {
        if (!socket || !socket.current) return;
        const ws = socket.current;
        const handleModifier = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'match' && data.subtype === 'modifier_played' && data.payload.targetPlayerId === currentPlayerIdx) {
                    const casterName = playersData?.[data.payload.playerId]?.username || 'Someone';
                    setCollectedModifiers((prev) => [...prev, { label: `Modifier by ${casterName}`, value: data.payload.value }]);
                }
            } catch { }
        };
        ws.addEventListener('message', handleModifier);
        return () => ws.removeEventListener('message', handleModifier);
    }, [socket, currentPlayerIdx, playersData]);

    useEffect(() => {
        if (socket && socket.current) {
            socket.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'match' && data.subtype === 'timer_update') {
                    setChallengeWindowTimeRemaining(data.payload.remainingTime);
                }

                if (data.type === 'dice_roll' && data.subtype === 'hero_roll') {
                    console.log('Received hero roll:', data.diceRoll);
                    setRolledValue(data.diceRoll);
                    setMinValue(data.minValue);
                    setShowResult(true);
                    setTimeout(() => setShowResult(false), 2000);
                }

                // Broadcast-driven (not the local 3D dice animation state), so the
                // roll and its breakdown are visible to every player watching this
                // board - not just whoever physically clicked the dice.
                if (data.type === 'roll_result' && data.subtype === 'monster_roll' && data.payload?.playerId === currentPlayerIdx) {
                    setRolledValue(data.payload.roll);
                    setMinValue(null);
                    setShowResult(true);
                    setTimeout(() => setShowResult(false), 2000);
                }

                if (data.type === 'roll_result' && data.subtype === 'duel_roll' && data.payload?.[currentPlayerIdx] != null) {
                    setRolledValue(data.payload[currentPlayerIdx]);
                    setMinValue(null);
                }

            };
        }
    }, [socket, currentPlayerIdx]);


    useEffect(() => {
        if (challengeWindowDuration && challengeWindowTimeRemaining) {
            const totalDuration = challengeWindowDuration * 1000;
            const percentage = (challengeWindowTimeRemaining / challengeWindowDuration) * 100;
            setProgress(percentage);
        } else {
            setProgress(0);
        }
    }, [challengeWindowTimeRemaining, challengeWindowDuration]);



    useEffect(() => {
        if (dice1Result !== null && dice2Result !== null) {

            if (socket && socket.current) {
                if (currentPlayerData?.orderRoll === null) {
                    socket.current.send(JSON.stringify({
                        type: 'match',
                        subtype: 'order_selection',
                        id: id,
                        payload: {
                            roll: dice1Result + dice2Result,
                        }
                    }));
                    setIsDiceDisabled(true);
                    return;
                }

                if (pendingHeroCard) {
                    socket.current.send(JSON.stringify({
                        type: 'match',
                        subtype: 'action',
                        action: 'process_hero_roll',
                        id: id,
                        payload: {
                            roll: dice1Result + dice2Result,
                        }
                    }));
                    setIsDiceDisabled(true);
                    return;
                }

                if (isPlayerChallenger) {
                    socket.current.send(JSON.stringify({
                        type: 'match',
                        subtype: 'process_challenge_roll',
                        id: id,
                        payload: {
                            roll: dice1Result + dice2Result,
                        }
                    }));
                    setIsDiceDisabled(true);
                    return;
                }

                if (isMonsterRoll) {
                    socket.current.send(JSON.stringify({
                        type: 'match',
                        subtype: 'process_monster_roll',
                        id: id,
                        payload: {
                            roll: dice1Result + dice2Result,
                        }
                    }));
                    setIsDiceDisabled(true);
                    return;
                }

            }
        }
    }, [dice1Result, dice2Result, socket]);


    const timeRemaining = (challengeWindowTimeRemaining ?? 0) / 1000;
    const isChallengeWindowActive = isDuel ? false : timeRemaining > 0.1;

    const areDiceDisabled = ((currentPlayerIdx != loggedUserId) && !isPlayerChallenger) || !canUse || isChallengeWindowActive;
    const dice1 = useDie("dice-1");
    const dice2 = useDie("dice-2");

    const showBreakdown = (pendingHeroCard || isPlayerChallenger || isMonsterRoll) && rolledValue !== null;
    const baseRoll = rolledValue ?? 0;
    const passiveSources = [...(currentPlayerData?.rollBonusSources || []), ...(currentPlayerData?.permanentRollBonusSources || [])];
    const passiveSum = (currentPlayerData?.rollBonusUntilEndOfTurn || 0) + (currentPlayerData?.permanentRollBonus || 0);
    const modifierSum = collectedModifiers.reduce((sum, m) => sum + m.value, 0);
    const totalRoll = baseRoll + passiveSum + modifierSum;


    return (
        <div className="dice-selection-container justify-center items-center flex" style={{ width: isDiceRollVisible ? '70%' : '100%' }}>
            {(pendingHeroCard || showResult) && lastPendingHeroCard && (
                <div className="hero-card-container mr-[200px] mb-[100px] party-hero-slide-in flex flex-col items-center">
                    <PartyHero
                        id={lastPendingHeroCard.cardId}
                        cardName={lastPendingHeroCard.cardName}
                        heroClass={lastPendingHeroCard.heroClass}
                        diceValue={lastPendingHeroCard.diceValue}
                        height={350}
                        width={350}
                        handleCardUse={() => {}}
                        isPlayerTurn={false}
                    />
                </div>
            )}
            {isMonsterRoll && monster && (
                <div className="hero-card-container mr-[200px] mb-[100px] party-hero-slide-in flex flex-col items-center">
                    <span className="monster-roll-banner-label">Attacking</span>
                    <TiltedCard
                        imageSrc={getMonsterArt(monster.name) || heroImg}
                        containerHeight="350px"
                        containerWidth="280px"
                        imageHeight="350px"
                        imageWidth="280px"
                        rotateAmplitude={10}
                        scaleOnHover={1}
                        showMobileWarning={false}
                        showTooltip={false}
                    />
                    <strong className="monster-roll-banner-name">{monster.name}</strong>
                    <span className="monster-roll-banner-threshold">Slay: {monster.slayThreshold}+</span>
                </div>
            )}
            <div className={
                'dices flex flex-col justify-center gap-16 w-[50%] relative dice-slide-in ' +
                (isDiceRollVisible ? 'slide-center' : 'slide-left')
            }>
                {isChallengeWindowActive && (
                    <div className={`absolute inset-0 flex flex-col items-center justify-center z-20`}>
                        <ChallengeButton progress={progress} timeRemaining={timeRemaining} socket={socket} id={id} canUse={canUse} />
                    </div>
                )}
                <div className='flex flex-row justify-center gap-16'>

                    {showResult && rolledValue !== null ?
                        (<>
                            <div className="text-4xl font-bold text-white mt-4">
                                {`${rolledValue} ${minValue ? `(Min: ${minValue})` : ''}`}
                            </div>

                        </>) :
                        <>

                            <div style={{ pointerEvents: areDiceDisabled ? 'none' : 'auto', opacity: areDiceDisabled ? 0.5 : 1 }}>
                                <Die
                                    id="dice-1"
                                    size={150}
                                    onRoll={(value) => {
                                        setDice1ResultState(value);
                                    }}

                                    onClick={(roll) => {
                                        if (!areDiceDisabled) {
                                            playSound('diceRoll')
                                            roll()
                                        }
                                    }}
                                />
                            </div>

                            <div style={{ pointerEvents: areDiceDisabled ? 'none' : 'auto', opacity: areDiceDisabled ? 0.5 : 1 }}>
                                <Die
                                    id="dice-2"
                                    size={150}
                                    onRoll={(value) => {

                                        setDice2ResultState(value);

                                    }}
                                    onClick={(roll) => {
                                        if (!areDiceDisabled) {
                                            playSound('diceRoll')
                                            roll()
                                        }
                                    }}
                                />
                            </div>
                        </>
                    }

                </div>

                {showBreakdown && (
                    <div className="roll-breakdown">
                        <div className="roll-breakdown-row roll-breakdown-base">
                            <span>Dice roll</span>
                            <span>{baseRoll}</span>
                        </div>
                        {passiveSources.map((label, idx) => (
                            <div className="roll-breakdown-row" key={`passive-${idx}`}>
                                <span>{label}</span>
                            </div>
                        ))}
                        {collectedModifiers.map((mod, idx) => (
                            <div className="roll-breakdown-row roll-breakdown-modifier" key={`mod-${idx}`}>
                                <span>{mod.label}</span>
                                <span>{mod.value > 0 ? `+${mod.value}` : mod.value}</span>
                            </div>
                        ))}
                        <div className="roll-breakdown-row roll-breakdown-total">
                            <span>Total</span>
                            <span>{totalRoll}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
export default DiceComponent;
