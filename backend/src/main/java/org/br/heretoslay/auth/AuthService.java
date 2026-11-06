package org.br.heretoslay.auth;

import org.br.heretoslay.auth.FirebaseTokenVerifier.VerifiedToken;
import org.br.heretoslay.entity.Player;
import org.java_websocket.WebSocket;
import org.json.JSONObject;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Binds WebSocket connections to signed-in players. A client signs in with Firebase first and
 * then sends its ID token ("login" on a fresh start, "resume" after a reload or reconnect); the
 * player's id and username are taken from the verified token, never from what the client says.
 */
public class AuthService {
    private static final AuthService instance = new AuthService();
    private final Map<WebSocket, Player> onlinePlayers = new ConcurrentHashMap<>();
    private volatile FirebaseTokenVerifier verifier;

    private AuthService() {}

    public static AuthService getInstance() {
        return instance;
    }

    /** Fails fast at gateway startup when the Firebase project is not configured. */
    public void init(String firebaseProjectId) {
        this.verifier = new FirebaseTokenVerifier(firebaseProjectId);
    }

    /** Drops the mapping for a closed connection. */
    public void handleDisconnect(WebSocket conn) {
        onlinePlayers.remove(conn);
    }

    /**
     * A player must have at most one live connection. Replacing an older one
     * prevents state broadcasts from resolving to a socket that is already gone.
     */
    private void bind(WebSocket conn, Player player) {
        onlinePlayers.entrySet().removeIf(entry -> entry.getValue().getId().equals(player.getId()) && !entry.getKey().equals(conn));
        onlinePlayers.put(conn, player);
    }

    public List<Player> getOnlinePlayers() {
        return onlinePlayers.values().stream().toList();
    }

    public void handleMessage(WebSocket conn, JSONObject json) {
        String subtype = json.optString("subtype");
        switch (subtype) {
            case "login" -> authenticate(conn, json, "login_success", "login_fail");
            case "resume" -> authenticate(conn, json, "resume_success", "resume_fail");
            default -> System.out.println("Unknown auth subtype: " + subtype);
        }
    }

    private void authenticate(WebSocket conn, JSONObject json, String successSubtype, String failSubtype) {
        JSONObject response = new JSONObject().put("type", "auth");
        JSONObject payload = json.optJSONObject("payload");
        String idToken = payload == null ? null : payload.optString("idToken", null);
        Optional<VerifiedToken> token = verifier == null ? Optional.empty() : verifier.verify(idToken);

        if (token.isEmpty()) {
            response.put("subtype", failSubtype).put("payload", new JSONObject().put("reason", "invalid_token"));
        } else if (!token.get().hasProfile()) {
            // Signed in with Firebase but has not picked a username in the accounts API yet.
            response.put("subtype", failSubtype).put("payload", new JSONObject().put("reason", "profile_required"));
        } else {
            Player player = new Player(token.get().uid(), token.get().username());
            bind(conn, player);
            response.put("subtype", successSubtype)
                    .put("payload", new JSONObject().put("username", player.getUsername()).put("id", player.getId()));
            System.out.println("Player signed in: " + player.getUsername());
        }
        conn.send(response.toString());
    }

    public Player getPlayerByConnection(WebSocket conn) {
        return onlinePlayers.get(conn);
    }

    public Player getPlayerById(String playerId) {
        return onlinePlayers.values().stream().filter(player -> player.getId().equals(playerId)).findFirst().orElse(null);
    }

    public WebSocket getConnectionByPlayerId(String playerId) {
        return onlinePlayers.entrySet().stream()
                .filter(entry -> entry.getValue().getId().equals(playerId))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);
    }
}
