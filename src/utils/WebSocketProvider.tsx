import React, { useRef, useEffect } from "react"
import WebSocketContext from "./WebSocketContext"


export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const wsRef = useRef<WebSocket | null>(null)

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:8887");
        wsRef.current = ws;

        return () => {
            if (ws.readyState === 1) { // OPEN
                ws.close();
            } else if (ws.readyState === 0) { // CONNECTING
                ws.onopen = () => ws.close();
            }
        }
    }, [])

    return (
        <WebSocketContext.Provider value={wsRef}>
            {children}
        </WebSocketContext.Provider>
    )
}