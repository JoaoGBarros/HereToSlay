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

function InGame() {

    let points = 3;

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

    const heroCard = [
        { id: 6, name: "Bard" },
        { id: 7, name: "Warrior" },
        { id: 8, name: "Mage" },
        { id: 9, name: "Rogue" },
        { id: 10, name: "Cleric" },
        { id: 10, name: "Cleric" },
        { id: 10, name: "Cleric" },
    ]

    const hand = [
        { id: 1, name: "Carta 1" },
        { id: 2, name: "Carta 2" },
        { id: 3, name: "Carta 3" },
        { id: 4, name: "Carta 3" },
        { id: 5, name: "Carta 3" },
        { id: 6, name: "Carta 3" },
        { id: 7, name: "Carta 3" },
        { id: 8, name: "Carta 3" },
        { id: 9, name: "Carta 3" },
    ]

    const monsterCard = [
        { id: 1, name: "Goblin" },
        { id: 2, name: "Orc" },
        { id: 3, name: "Dragon" },
    ]

    const [heroPage, setHeroPage] = useState(0);
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const heroesPerPage = 6;
    const heroPages = Math.ceil(heroCard.length / heroesPerPage);

    const currentHeroCards = heroCard.slice(
        heroPage * heroesPerPage,
        heroPage * heroesPerPage + heroesPerPage
    );

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

                    <div className="deck-discard-row flex flex-row gap-8 justify-around">
                        {/* Deck empilhado */}
                        <div className="deck-area deck-stack relative w-32 h-44">
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
                    </div>

                    <div className='party-area flex'>

                        <div
                            className='ml-4 flex party-leader items-center gap-4'
                            style={{
                                width: `${20 + monsterCard.length * 10}%`,
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
                            className='heroCard-area grid grid-cols-3'
                            style={{
                                width: '50%',
                                transition: 'width 0.3s'
                            }}
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

                    <div className='hand-area mt-10 mb-10 flex justify-center relative' style={{ height: "200px" }}>
                        {hand.map((card, idx) => {
                            const total = hand.length;
                            const spread = 15; // graus de abertura do leque
                            const start = -spread / 2;
                            const angle = start + (spread / (total - 1 || 1)) * idx;
                            return (
                                <div
                                    key={card.id + "-" + idx}
                                    style={{
                                        position: "absolute",
                                        left: `calc(50% - 60px)`,
                                        bottom: "0",
                                        transform: `translateX(${(idx - total / 2) * 120}px) rotate(${angle}deg)`,
                                        zIndex: idx,
                                        transition: "transform 0.2s",
                                    }}
                                >
                                    <HandCards/>
                                </div>
                            );
                        })}
                    </div>

                </div>

            </div>
    );
}

export default InGame;