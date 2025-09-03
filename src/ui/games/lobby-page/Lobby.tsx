import WebSocketContext from "@/utils/WebSocketContext";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function Lobby() {

    const [usernames, setUsernames] = useState<string[]>([]);
    const [lobbyName, setLobbyName] = useState<string>("");
    const navigate = useNavigate();
    const { id } = useParams();
    const socket = useContext(WebSocketContext);

    if(socket && socket.current) {
        socket.current.onmessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'lobby' && data.subtype === 'lobby_update') {
                    setUsernames(data.payload.username);
                    setLobbyName(data.payload.name);
                }

                if (data.type === 'lobby' && data.subtype === 'leave_response') {
                    navigate('/games');
                }
            } catch (e) {
                console.error('Erro ao processar mensagem:', e);
            }
        };
    }

    useEffect(() => {
        if (socket && socket.current) {
            socket.current.send(JSON.stringify({
                type: 'lobby',
                subtype: 'join',
                payload: {
                    lobbyId: id
                }
            }));

        }

    }, [id, socket]);


    function handleLeaveLobby(){
        if (socket && socket.current) {
            socket.current.send(JSON.stringify({
                type: 'lobby',
                subtype: 'leave',
                payload: {
                    lobbyId: id
                }
            }));
        }
    }


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

                    <Button onPress={() => handleLeaveLobby()}>Sair do lobby</Button>
                </Card>
            </div>
    );
}

export default Lobby;