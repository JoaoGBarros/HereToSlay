import WebSocketContext from "@/utils/WebSocketContext";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function Lobby() {

    const [usernames, setUsernames] = useState<string[]>([]);
    const [lobbyName, setLobbyName] = useState<string>("");
    const [countdown, setCountdown] = useState<number | null>(null);
    const [minPlayers, setMinPlayers] = useState<number | null>(null);
    const [playerAmount, setPlayerAmount] = useState<number | null>(null);
    const navigate = useNavigate();
    const { id } = useParams();
    const socket = useContext(WebSocketContext);

    useEffect(() => {
        if (socket && socket.current && id) {

            // 1. Registra o listener PRIMEIRO para não perder nenhuma mensagem
            socket.current.onmessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'lobby') {
                        if (data.subtype === 'lobby_update') {
                            setUsernames(data.payload.username);
                            setLobbyName(data.payload.name);
                        }

                        if (data.subtype === 'leave_response') {
                            navigate('/games');
                        }

                        if (data.subtype === 'countdown_update') {
                            setCountdown(data.payload.timeLeft);
                            setPlayerAmount(data.payload.playerAmount);
                            setMinPlayers(data.payload.minPlayers);
                        }

                        if (data.subtype === 'countdown_finished') {
                            navigate(`/match/${id}`);
                        }
                    }
                } catch (e) {
                    console.error('Erro ao processar mensagem no Lobby:', e);
                }
            };

            // 2. DEPOIS de estar escutando, avisa o backend que entrou/precisa dos dados
            socket.current.send(JSON.stringify({
                type: 'lobby',
                subtype: 'join',
                payload: {
                    lobbyId: Number(id) // Convertido para Number para bater com o getLong() do backend
                }
            }));
        }
    }, [id, socket, navigate]);


    function handleLeaveLobby() {
        if (socket && socket.current) {
            socket.current.send(JSON.stringify({
                type: 'lobby',
                subtype: 'leave',
                payload: {
                    lobbyId: Number(id)
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
                {countdown !== null && countdown !== -1 && (
                    <div className="countdown-info">
                        <h3>Partida começando em: {countdown}s</h3>
                        <p>Jogadores: {playerAmount} / {minPlayers}</p>
                    </div>
                )}
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