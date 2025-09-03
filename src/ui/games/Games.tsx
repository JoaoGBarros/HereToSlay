import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Image } from "@heroui/image";
import './Games.css'
import { use, useContext, useEffect, useState } from "react";
import LobbyForm from "./lobby-form/LobbyForm";

import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    useDisclosure,
    Checkbox,
    Input,
    Link,
} from "@heroui/react";
import WebSocketContext from "@/utils/WebSocketContext";
import { useNavigate } from "react-router-dom";
import type { LobbyStatus } from "./enum/StatusEnum";

function Games() {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [lobbyName, setLobbyName] = useState("");
    const [minPlayers, setMinPlayers] = useState(2);
    const [maxPlayers, setMaxPlayers] = useState(6);
    const [lobbys, setLobbys] = useState<{ id: number, name: string, playerAmount: number, maxPlayers: number, status : LobbyStatus}[]>([]);
    const socket = useContext(WebSocketContext);
    const navigate = useNavigate();

    if (socket && socket.current) {
            socket.current.send(JSON.stringify({
                type: 'lobby',
                subtype: 'list'
            }));

            socket.current.onmessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'lobby' && data.subtype === 'list_response') {
                        setLobbys(data.payload);
                    }
                } catch (e) {
                    console.error('Erro ao processar mensagem:', e);
                }
            };
        }

    useEffect(() => {
        const user = localStorage.getItem('currentPlayer');
        if (!user) {
            navigate('/');
        }
    }, [navigate]);


    function handleCreateLobby(onClose: () => void) {
        if (!lobbyName || !minPlayers || !maxPlayers || minPlayers < 2 || maxPlayers > 6) return;
        if (socket && socket.current) {
            socket.current.send(JSON.stringify({
                type: 'lobby',
                subtype: 'create',
                payload: {
                    name: lobbyName,
                    minPlayers: Number(minPlayers),
                    maxPlayers: Number(maxPlayers),
                }
            }));
        }
        setLobbyName('');
        setMinPlayers(2);
        setMaxPlayers(6);
        onClose();
    }

    return (
        <>
            <div className="games-container">
                <Card className="lobbys-container">
                    <CardHeader>
                        <div className="games-header">
                            <h2>Lobbys</h2>
                        </div>
                    </CardHeader>
                    <div className="lobbys-grid">
                        <Button onPress={onOpen}>New Lobby</Button>
                        {lobbys.map(lobby => (
                            <Card key={lobby.id} className="lobby-card">
                                <CardBody>
                                    <Button onPress={() => navigate(`/lobby/${lobby.id}`)}>{lobby.name}</Button>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </Card>
            </div>

            <Modal isOpen={isOpen} placement="center" onOpenChange={onOpenChange} className="heroui-modal">
                <Card className="modal-card">

                </Card>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <Card className="modal-card w-[50%] h-[50%] content-evenly">
                                <ModalHeader className="flex flex-col gap-1">Novo Lobby</ModalHeader>
                                <ModalBody>
                                    <Input
                                        placeholder="Informe o nome do lobby"
                                        variant="bordered"
                                        type="text"
                                        required
                                        value={lobbyName}
                                        onChange={e => setLobbyName(e.target.value)}
                                    />
                                    <Input
                                        placeholder="Minimo de Jogadores"
                                        variant="bordered"
                                        type="number"
                                        required
                                        value={minPlayers.toString()}
                                        min={2}
                                        max={6}
                                        onChange={e => setMinPlayers(Number(e.target.value))}
                                    />
                                    <Input
                                        placeholder="Maximo de Jogadores"
                                        variant="bordered"
                                        type="number"
                                        required
                                        value={maxPlayers.toString()}
                                        min={2}
                                        max={6}
                                        onChange={e => setMaxPlayers(Number(e.target.value))}
                                    />

                                    {/* <div className="flex py-2 px-1 justify-between">
                                        <Checkbox
                                            classNames={{
                                                label: "DLC 1",
                                            }}
                                        >
                                            DLC 1
                                        </Checkbox>
                                        <Checkbox
                                            classNames={{
                                                label: "DLC 2",
                                            }}
                                        >
                                            DLC 2
                                        </Checkbox>
                                    </div> */}
                                </ModalBody>
                                <ModalFooter>
                                    <Button color="danger" onPress={onClose}>
                                        Close
                                    </Button>
                                    <Button color="primary" onPress={() => handleCreateLobby(onClose)}>
                                        Criar Lobby
                                    </Button>
                                </ModalFooter>
                            </Card>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    )

}

export default Games;