import { PartyHero } from "@/ui/games/common/cards/partyHero/PartyHero";
import { PartyLeader } from "@/ui/games/common/cards/partyLeader/PartyLeader";
import { useEffect, useState } from "react";

interface PartyComponentProps {
    isPlayerTurn: boolean;
    currentPlayerData: any;
    partyLeaderSelection: boolean;
    monsterCard: Array<any>;
    availablePartyLeaders: Array<string>;
    socket: React.MutableRefObject<WebSocket | null> | null;
    id: string | undefined;
    currentPlayerIdx?: string;
}

function PartyComponent({ isPlayerTurn, currentPlayerData, partyLeaderSelection, monsterCard, availablePartyLeaders, socket, id, currentPlayerIdx }: PartyComponentProps) {

    const [heroPage, setHeroPage] = useState(0);
    const [currentHeroCards, setCurrentHeroCards] = useState<Array<any>>([]);
    const [heroPages, setHeroPages] = useState(0);
    const heroesPerPage = 6;

    const classes = ["BARD", "FIGHTER", "GUARDIAN", "RANGER", "THIEF", "WIZARD"];

    useEffect(() => {
        setHeroPage(0);
    }, [currentPlayerData]);


    useEffect(() => {

        if (currentPlayerData?.party) {

            setCurrentHeroCards(currentPlayerData?.party.slice(
                heroPage * heroesPerPage,
                heroPage * heroesPerPage + heroesPerPage
            ));

            setHeroPages(Math.ceil(currentPlayerData?.party.length / heroesPerPage));
        }
    }, [currentPlayerData, heroPage]);

    function handleChoosePartyLeader(leader: string) {
        if (socket && socket.current) {
            socket.current.send(JSON.stringify({
                type: 'match',
                subtype: 'choose_party_leader',
                id: id,
                payload: {
                    party_leader: leader,
                }
            }));
        }
    }


    function handleOnDrop(e: React.DragEvent) {
        console.log("drop");
        const cardId = e.dataTransfer.getData("cardId");
        console.log(cardId);
        if (socket && socket.current && isPlayerTurn) {
            socket.current.send(JSON.stringify({
                type: 'match',
                subtype: 'action',
                action: 'play_card',
                id: id,
                payload: {
                    card_id: cardId,
                }
            }));
        }
        e.dataTransfer.clearData();
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }



    return (
        <>
            <div
                className='ml-4 flex party-leader items-center gap-4'
                style={{
                    width: `${partyLeaderSelection ? 20 + monsterCard.length * 15 : 20 + 5 * 15}%`,
                    transition: 'width 0.3s'
                }}
            >

                {partyLeaderSelection ? (
                    <>
                        {classes.map((leaderClass, index) => {
                            const isSelectable = availablePartyLeaders.includes(leaderClass);
                            return (
                                <div
                                    key={leaderClass}
                                    style={{ animationDelay: `${index * 150}ms` }}
                                    className={`card-appear ${!isSelectable ? 'grayscale' : ''}`}
                                >
                                    <PartyLeader
                                        leader={leaderClass}
                                        isSelectionStage={partyLeaderSelection}
                                        isPlayerTurn={isPlayerTurn}
                                        chooseLeader={isSelectable ? handleChoosePartyLeader : () => { }}
                                    />
                                </div>
                            );
                        })}
                    </>

                ) : (
                    <>
                        <div className={parseInt(currentPlayerIdx!) % 2 === 0 ? "leader-appear-animation-A" : "leader-appear-animation-B"}>
                            {currentPlayerData?.leader && (
                                <PartyLeader leader={currentPlayerData.leader} isSelectionStage={partyLeaderSelection} isPlayerTurn={isPlayerTurn} chooseLeader={handleChoosePartyLeader} />
                            )}
                            {monsterCard.map((card) => (
                                <PartyLeader key={card.id} leader='BARD' isSelectionStage={partyLeaderSelection} isPlayerTurn={isPlayerTurn} chooseLeader={handleChoosePartyLeader} />
                            ))}
                        </div>
                    </>

                )}
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
                    width: `70%`,
                    transition: 'width 0.3s'
                }}
                onDrop={handleOnDrop}
                onDragOver={handleDragOver}
            >
                {currentHeroCards?.length > 0 && currentHeroCards?.map((card, index) => (
                    <div
                        key={card.cardId}
                        className="card-appear"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <PartyHero id={card.cardId.toString()} />
                    </div>
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
        </>
    );
}
export default PartyComponent;