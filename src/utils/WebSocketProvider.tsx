import { useEffect, useState, type ReactNode } from "react"
import { useAuth } from "@/auth/AuthContext"
import WebSocketContext from "./WebSocketContext"

function resolveWebSocketUrl() {
    const env = import.meta.env

    const configuredUrl = env.VITE_BACKEND_WS_URL
    if (configuredUrl && configuredUrl.trim().length > 0) {
        return configuredUrl.trim()
    }

    const host = env.VITE_BACKEND_HOST && env.VITE_BACKEND_HOST.trim().length > 0
        ? env.VITE_BACKEND_HOST.trim()
        : window.location.hostname || "localhost"
    const port = env.VITE_BACKEND_PORT && env.VITE_BACKEND_PORT.trim().length > 0
        ? env.VITE_BACKEND_PORT.trim()
        : "8889"
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"

    return `${protocol}//${host}:${port}`
}

function goHome() {
    if (window.location.protocol === "file:") {
        if (window.location.hash !== "#/") window.location.hash = "#/"
    } else if (window.location.pathname !== "/") {
        window.location.assign("/")
    }
}

/**
 * Opens the game socket only once the player is signed in and has a profile, and signs the socket
 * in with a fresh Firebase ID token as its very first message (before any page sends an action).
 * Signing out closes it.
 */
export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
    const { status, user, getIdToken, signOut } = useAuth()
    // State (not a ref) so consumers re-render when the connection is created.
    // Pages mount their message listeners in effects; a ref would stay stale and listeners
    // would attach to a closed socket.
    const [socket, setSocket] = useState<WebSocket | null>(null)
    const isReady = status === "ready"
    const uid = user?.uid ?? null

    useEffect(() => {
        if (!isReady || !uid) {
            setSocket(null)
            return
        }
        let ws: WebSocket | null = null
        let cancelled = false

        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data)
                if (data?.type !== "auth") return
                if (data.subtype === "login_success" || data.subtype === "resume_success") {
                    localStorage.setItem("currentPlayer", JSON.stringify(data.payload))
                } else if (data.subtype === "login_fail" || data.subtype === "resume_fail") {
                    localStorage.removeItem("currentPlayer")
                    void signOut()
                    goHome()
                }
            } catch {
                // Not JSON; other listeners ignore it too.
            }
        }

        void getIdToken().then((idToken) => {
            if (cancelled || !idToken) return
            const created = new WebSocket(resolveWebSocketUrl())
            ws = created
            // Registered before any page can queue a message, so the login always goes first.
            created.addEventListener("open", () => {
                if (cancelled) {
                    created.close()
                    return
                }
                created.send(JSON.stringify({ type: "auth", subtype: "login", payload: { idToken } }))
            })
            created.addEventListener("message", handleMessage)
            setSocket(created)
        })

        return () => {
            cancelled = true
            if (!ws) return
            ws.removeEventListener("message", handleMessage)
            // CONNECTING sockets close themselves on open (React StrictMode mounts effects twice).
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING) ws.close()
        }
    }, [isReady, uid, getIdToken, signOut])

    return (
        <WebSocketContext.Provider value={socket}>
            {children}
        </WebSocketContext.Provider>
    )
}
