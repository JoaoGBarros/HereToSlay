import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/react";

function Lobby() {

    const usernames = [
        "User1",
        "User2",
        "User3"
    ]

    const lobbyName = "Lobby 1";

    return (
        <div className="games-container">
                <Card className="lobbys-container">
                    <CardHeader>
                        <div className="games-header">
                            <h2>{lobbyName}</h2>
                        </div>
                    </CardHeader>
                    <div className="lobbys-grid">
                        {usernames.map((username, index) => (
                            <Card key={index} className="lobby-card">
                                <CardBody>
                                    <Button>{username}</Button>
                                </CardBody>
                            </Card>
                        ))}
                    </div>

                    <Button>Sair do lobby</Button>
                </Card>
            </div>
    );
}

export default Lobby;