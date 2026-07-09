import { Label } from '@/components/ui/label';
import './LobbyForm.css'
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

function LobbyForm({ onClose }: { onClose?: () => void }) {
    return (
        <Modal placement="top-center">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">Create Lobby</ModalHeader>
                        <ModalBody>
                            <Label htmlFor="lobby-name">Lobby Name</Label>
                            <Input
                                id="lobby-name"
                                type="text"
                                placeholder="Enter the lobby name"
                                required
                            />
                            <div className="flex py-2 px-1 justify-between">
                                <Checkbox
                                    classNames={{
                                        label: "text-small",
                                    }}
                                >
                                    Remember me
                                </Checkbox>
                                <Link color="primary" href="#" size="sm">
                                    Forgot password?
                                </Link>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="flat" onPress={onClose}>
                                Close
                            </Button>
                            <Button color="primary" onPress={onClose}>
                                Sign in
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}

export default LobbyForm;