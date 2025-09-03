import { Avatar } from '@heroui/avatar';
import './InGame.css';
import avatarImg from '../assets/150.jpg';
import { Card } from '@heroui/card';
import deckImg from '../assets/deck.png';
import bardImg from '../assets/bard.png';
import { PartyLeader } from '../games/common/cards/partyLeader/PartyLeader';
import { PartyHero } from "../games/common/cards/partyHero/PartyHero";
import { useState } from 'react';
import HandCards from '../games/common/cards/handCards/HandCards';
import iconPlayer from "../assets/icon-player.png";
import bardIcon from '../assets/class-icons/bard.png';
import warriorIcon from '../assets/class-icons/warrior.png';
import mageIcon from '../assets/class-icons/mage.png';
import thiefIcon from '../assets/class-icons/thief.png';
import guardianIcon from '../assets/class-icons/guardian.png';
import rangerIcon from '../assets/class-icons/ranger.png';

function InGame() {

    let maxPoints = 3;

    const classIcons: Record<string, string> = {
        Bard: bardIcon,
        Warrior: warriorIcon,
        Mage: mageIcon,
        Thief: thiefIcon,
        Ranger: rangerIcon,
        Guardian: guardianIcon,
    };

    const [points, setPoints] = useState(3);
    const [showTooltip, setShowTooltip] = useState(false);
    const [showMyHand, setShowMyHand] = useState(false);
    const userid = 1;
    const players = [
        { id: 1, nickname: "Jogador123", avatar: iconPlayer },
        { id: 2, nickname: "Maria", avatar: avatarImg },
        { id: 3, nickname: "Carlos", avatar: avatarImg },
        { id: 4, nickname: "Jogador123", avatar: iconPlayer },
        { id: 5, nickname: "Maria", avatar: avatarImg },
        { id: 6, nickname: "Carlos", avatar: avatarImg },
    ];
    const [currentPlayer, setCurrentPlayer] = useState(players[0]);


    function handlePlayerChange(player: typeof players[0]) {
        setShowMyHand(false);
        setCurrentPlayer(player);

    }

    const deck = [
        { id: 1, name: "Carta 1" },
        { id: 2, name: "Carta 2" },
        { id: 3, name: "Carta 3" },
        { id: 4, name: "Carta 4" },
        { id: 5, name: "Carta 5" },
    ];

    const discard = [
        { id: 6, name: "Carta 6" },
        { id: 7, name: "Carta 7" },
    ];

    const [heroCard, setHeroCard] = useState([
        { id: 6, name: "Bard" },
        { id: 7, name: "Warrior" },
        { id: 8, name: "Mage" },
        { id: 9, name: "Thief" },
        { id: 10, name: "Guardian" },
        { id: 11, name: "Ranger" },
    ]);

    const classCounts = heroCard.reduce<Record<string, number>>((acc, card) => {
        acc[card.name] = (acc[card.name] || 0) + 1;
        return acc;
    }, {});

    const [hand, setHand] = useState([
        { id: 1, name: "Carta 1" },
        { id: 2, name: "Carta 2" },
        { id: 3, name: "Carta 3" },
        { id: 4, name: "Carta 3" },
        { id: 5, name: "Carta 3" },
        { id: 6, name: "Carta 3" },
        { id: 7, name: "Carta 3" },
        { id: 8, name: "Carta 3" },
        { id: 9, name: "Carta 3" },
    ]);

    const monsterCard = [
        { id: 1, name: "Goblin" },
        { id: 2, name: "Orc" },
        { id: 3, name: "Dragon" },
    ]

    const card = { id: 19, name: "Carta Exemplo" };

    const [heroPage, setHeroPage] = useState(0);
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const heroesPerPage = 6;
    const heroPages = Math.ceil(heroCard.length / heroesPerPage);

    const currentHeroCards = heroCard.slice(
        heroPage * heroesPerPage,
        heroPage * heroesPerPage + heroesPerPage
    );

    function handleOnDrag(e: React.DragEvent) {
        e.dataTransfer.effectAllowed = "move";
        console.log("drag");
        e.dataTransfer.setData("cardId", e.currentTarget.id);
    }

    function handleOnDrop(e: React.DragEvent) {
        console.log("drop");
        const id = e.dataTransfer.getData("cardId");
        console.log(id);
        const cardToAdd = hand.find(card => card.id.toString() === id);
        if (cardToAdd) {
            setHeroCard(prev => [...prev, cardToAdd]);
            setHand(prevHand => prevHand.filter(card => card.id.toString() !== id));
        }
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }

    function handleDeckClick() {
        console.log("Deck clicked");
        setHand(prevHand => [...prevHand, card]);
    }

    function handleDiscardAll() {
        console.log("Discard all cards");
        setPoints(prevPoints => prevPoints - 1);
        setHand([]);
    }

    return (
        <div className='ingame-background'>
            {/* <div className='players absolute self-end'>
                <div className='player top-0 left-0'>

                    <Card className='bg-white w-40 items-center'>

                        <Avatar
                            className="w-10 h-10 text-large"
                            src={avatarImg}
                        />
                        <Avatar
                            className="w-10 h-10 text-large"
                            src={avatarImg}
                        />
                        <Avatar
                            className="w-10 h-10 text-large"
                            src={avatarImg}
                        />
                    </Card>
                </div>
            </div> */}
            <div className='player-area'>

                <div className="deck-discard-row flex flex-row gap-8 mb-5 justify-around items-center">
                    {/* Deck empilhado */}
                    <div className="deck-area deck-stack relative w-32 h-44" onClick={handleDeckClick}>
                        {deck.map((card, idx) => (
                            <Card
                                key={card.id}
                                className="deck-card absolute w-24 h-36 flex items-center justify-center bg-white shadow"
                                style={{
                                    left: `${idx * 2}px`,
                                    top: `${idx * 3}px`,
                                    zIndex: deck.length - idx,
                                    transform: `rotate(90deg) translateY(-30px) translateX(30px)`,
                                    backgroundImage: `url(${deckImg})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                            />
                        ))}
                    </div>
                    {/* Descarte empilhado */}
                    <div className="discard-area deck-stack relative w-32 h-44">
                        {discard.map((card, idx) => (
                            <Card
                                key={card.id}
                                className="deck-card absolute w-24 h-36 flex items-center justify-center bg-white shadow"
                                style={{
                                    left: `${idx * 2}px`,
                                    top: `${idx * 3}px`,
                                    zIndex: discard.length - idx,
                                    transform: `rotate(90deg) translateY(-30px) translateX(30px)`,
                                    backgroundImage: `url(${deckImg})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                            />
                        ))}
                    </div>
                    <div className="player-switcher flex gap-4 mb-6 items-center">
                        {players.map(player => (
                            <button
                                key={player.id}
                                onClick={() => handlePlayerChange(player)}
                                style={{
                                    padding: 0,
                                    borderRadius: "50%",
                                    border: currentPlayer.id === player.id ? "2px solid #e2b007" : "1px solid #ccc",
                                    background: currentPlayer.id === player.id ? "#fffbe6" : "#fff",
                                    cursor: "pointer",
                                    width: "60px",
                                    height: "60px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <img
                                    src={player.avatar}
                                    alt={player.nickname}
                                    style={{
                                        width: "56px",
                                        height: "56px",
                                        borderRadius: "50%",
                                        objectFit: "cover"
                                    }}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                <div className='party-area flex'>

                    <div
                        className='ml-4 flex party-leader items-center gap-4'
                        style={{
                            width: `${20 + monsterCard.length * 15}%`,
                            transition: 'width 0.3s'
                        }}
                    >
                        <PartyLeader />
                        {monsterCard.map((card) => (
                            <PartyLeader key={card.id} />
                        ))}
                    </div>

                    {heroPages > 1 && heroPage > 0 && (
                        <button
                            onClick={() => setHeroPage(heroPage - 1)}
                            className="mx-2 px-2 py-1 bg-gray-200 rounded disabled:opacity-50 self-center"
                        >
                            &lt;
                        </button>
                    )}

                    <div
                        className='heroCard-area grid grid-cols-3 items-center'
                        style={{
                            width: '50%',
                            transition: 'width 0.3s'
                        }}

                        onDrop={handleOnDrop}
                        onDragOver={handleDragOver}
                    >
                        {currentHeroCards.map((card, idx) => (
                            <PartyHero key={`${card.id}-${idx}`} />
                        ))}


                    </div>

                    {heroPages > 1 && (
                        <button
                            disabled={heroPage === heroPages - 1}
                            onClick={() => setHeroPage(heroPage + 1)}
                            className="mx-2 px-2 py-1 bg-gray-200 rounded disabled:opacity-50 self-center"
                        >
                            &gt;
                        </button>
                    )}
                </div>

                <div className='hand-area flex relative row mt-10'>
                    <Card className='p-10 h-full player-info-card' >
                        <div className='player-info h-full content-center flex items-center flex-col gap-10'>
                            <div className='discard-all-cards'>
                                <button onClick={handleDiscardAll} className='bg-red-500 text-white px-4 py-2 rounded'>
                                    Reset Cards
                                </button>
                            </div>
                            <div className="avatar-tooltip-wrapper" style={{ position: "relative", display: "inline-block" }}>
                                <img
                                    src={currentPlayer.avatar}
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
                                        {currentPlayer.nickname}
                                    </div>
                                )}
                            </div>
                            <div className='action-points flex items-center gap-2'>
                                {Array.from({ length: maxPoints }).map((_, idx) => (
                                    <span
                                        key={idx}
                                        style={{
                                            display: 'inline-block',
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            background: idx < points ? 'gold' : '#bbb',
                                            marginLeft: '4px',
                                            border: '2px solid #e2b007',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </Card>
                    <div className='hand-cards'>
                        {(currentPlayer.id === userid || showMyHand) ? (
                            hand.map((card, idx) => {
                                const total = hand.length;
                                const spread = 15;
                                const start = -spread / 2;
                                const angle = start + (spread / (total - 1 || 1)) * idx;
                                const scale = total > 13 ? Math.max(0.4, 1 - 0.05 * (total - 13)) : 1;
                                const baseSpacing = 120;
                                const spacing = total > 7 ? baseSpacing * Math.max(0.4, 1 - 0.04 * (total - 7)) : baseSpacing;
                                return (
                                    <div
                                        draggable
                                        id={idx.toString()}
                                        key={card.id + "-" + idx}
                                        style={{
                                            position: "absolute",
                                            left: `calc(50% - 120px)`,
                                            bottom: "0",
                                            transform: `translateX(${(idx - total / 2) * spacing}px) rotate(${angle}deg) scale(${scale})`,
                                            zIndex: idx,
                                            transition: "transform 0.2s",
                                        }}
                                    >
                                        <HandCards onDrag={handleOnDrag} card={{ id: card.id }} />
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
                                onClick={() => {
                                    setShowMyHand(true);
                                }}
                            >
                                Mostrar minhas cartas
                            </button>
                        )}
                    </div>
                    <div
                        className="class-counter"
                        style={{
                            position: "absolute",
                            top: 24,
                            right: 24,
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            background: "rgba(255,255,255,0.95)",
                            borderRadius: "12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                            padding: "12px 16px",
                            zIndex: 100,
                            alignItems: "flex-end"
                        }}
                    >
                        {Object.entries(classCounts).map(([className, count]) => (
                            <div key={className} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <img
                                    src={classIcons[className]}
                                    alt={className}
                                    style={{ width: 28, height: 28, objectFit: "contain" }}
                                />
                                <span style={{ fontWeight: 700, color: "#b48a5a", fontSize: 18 }}>{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

        </div>
    );
}

export default InGame;