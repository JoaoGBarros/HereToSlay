import { createContext, type MutableRefObject } from "react"


const WebSocketContext = createContext<MutableRefObject<WebSocket | null> | null>(null)
export default WebSocketContext