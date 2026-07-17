import { useEffect, useRef, type ReactNode } from "react"
import WebSocketContext from "./WebSocketContext"

function resolveWebSocketUrl() {
    const env = (import.meta as ImportMeta & {
        env?: {
            VITE_BACKEND_WS_URL?: string
            VITE_BACKEND_HOST?: string
            VITE_BACKEND_PORT?: string
        }
    }).env

    const configuredUrl = env?.VITE_BACKEND_WS_URL
    if (configuredUrl && configuredUrl.trim().length > 0) {
        return configuredUrl.trim()
    }

    const host = env?.VITE_BACKEND_HOST && env.VITE_BACKEND_HOST.trim().length > 0
        ? env.VITE_BACKEND_HOST.trim()
        : window.location.hostname || "localhost"
    const port = env?.VITE_BACKEND_PORT && env.VITE_BACKEND_PORT.trim().length > 0
        ? env.VITE_BACKEND_PORT.trim()
        : "8889"
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"

    return `${protocol}//${host}:${port}`
}

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
    const wsRef = useRef<WebSocket | null>(null)

    useEffect(() => {
        const socket = new WebSocket(resolveWebSocketUrl())
        let shouldCloseWhenReady = false

        socket.addEventListener("open", () => {
            if (shouldCloseWhenReady) {
                socket.close()
            }
        })

        wsRef.current = socket

        return () => {
            shouldCloseWhenReady = true

            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CLOSING) {
                socket.close()
            }
        }
    }, [])

    return (
        <WebSocketContext.Provider value={wsRef}>
            {children}
        </WebSocketContext.Provider>
    )
}