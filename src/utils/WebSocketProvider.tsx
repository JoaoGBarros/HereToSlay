import React, { createContext, useRef, useEffect } from "react"
import type { MutableRefObject } from "react"
import WebSocketContext from "./WebSocketContext"


export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const wsRef = useRef<WebSocket | null>(null)

    useEffect(() => {
        wsRef.current = new WebSocket("ws://localhost:8887")
        return () => {
            wsRef.current?.close()
        }
    }, [])

    return (
        <WebSocketContext.Provider value={wsRef}>
            {children}
        </WebSocketContext.Provider>
    )
}