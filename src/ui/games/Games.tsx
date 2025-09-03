import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Image } from "@heroui/image";
import './Games.css'
import { useState } from "react";
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

function Games() {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();

    const lobbys = [
        { id: 1, name: "Lobby 1" },
        { id: 2, name: "Lobby 2" },
        { id: 3, name: "Lobby 3" },
    ];

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
                                    <Button>{lobby.name}</Button>
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
                            <Card className="modal-card">
                                <ModalHeader className="flex flex-col gap-1">Novo Lobby</ModalHeader>
                                <ModalBody>
                                    <Input
                                        label="Lobby"
                                        placeholder="Informe o nome do lobby"
                                        variant="bordered"
                                    />
                                    <div className="flex py-2 px-1 justify-between">
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
                                    </div>
                                </ModalBody>
                                <ModalFooter>
                                    <Button color="danger" onPress={onClose}>
                                        Close
                                    </Button>
                                    <Button color="primary" onPress={onClose}>
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