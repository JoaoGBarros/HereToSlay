import { useEffect, useState, type ReactNode } from "react"
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

function readStoredPlayer(): { id: string; username: string } | null {
    try {
        const parsed = JSON.parse(localStorage.getItem("currentPlayer") || "null")
        if (!parsed?.id || !parsed?.username) return null
        return { id: String(parsed.id), username: String(parsed.username) }
    } catch {
        return null
    }
}

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
    // State (not a ref) so consumers re-render when the connection is created.
    // Pages mount their message listeners in effects, which run before this
    // provider's effect on first render; a ref would stay stale and listeners
    // would attach to a closed socket.
    const [socket, setSocket] = useState<WebSocket | null>(null)

    useEffect(() => {
        const ws = new WebSocket(resolveWebSocketUrl())
        let shouldCloseWhenReady = false

        const handleOpen = () => {
            if (shouldCloseWhenReady) {
                ws.close()
                return
            }
            // A full reload/direct URL navigation creates a new socket. Reclaim
            // the stored identity before page effects send their first action.
            const player = readStoredPlayer()
            if (player) {
                ws.send(JSON.stringify({ type: "auth", subtype: "resume", payload: player }))
            }
        }

        const handleMessage = (event: MessageEvent) => {
            if (shouldCloseWhenReady) return
            try {
                const data = JSON.parse(event.data)
                if (data?.type === "auth" && data.subtype === "resume_fail") {
                    localStorage.removeItem("currentPlayer")
                    if (window.location.protocol === "file:") {
                        if (window.location.hash !== "#/") window.location.hash = "#/"
                    } else if (window.location.pathname !== "/") {
                        window.location.assign("/")
                    }
                }
            } catch {
                // Not JSON; other listeners ignore it too.
            }
        }

        ws.addEventListener("open", handleOpen)
        ws.addEventListener("message", handleMessage)

        setSocket(ws)

        return () => {
            shouldCloseWhenReady = true
            ws.removeEventListener("message", handleMessage)

            // Keep handleOpen attached for CONNECTING sockets: it closes them
            // as soon as they open (React StrictMode mounts effects twice).
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING) {
                ws.close()
            }
        }
    }, [])

    return (
        <WebSocketContext.Provider value={socket}>
            {children}
        </WebSocketContext.Provider>
    )
}
