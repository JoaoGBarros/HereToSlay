package org.br.heretoslay.auth;

import org.br.heretoslay.entity.Player;
import org.java_websocket.WebSocket;
import org.json.JSONObject;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static java.util.Arrays.stream;

public class AuthService {
    private static final AuthService instance = new AuthService();
    private final Map<WebSocket, Player> onlinePlayers = new ConcurrentHashMap<>();

    private AuthService() {}

    public static AuthService getInstance() {
        if(instance == null) {
            return new AuthService();
        }
        return instance;
    }

    public Player handleLogin(WebSocket conn, JSONObject json) {
        String username = json.getJSONObject("payload").getString("username");
        Player player = new Player(username);
        bind(conn, player);
        return player;
    }

    /**
     * Re-attaches a fresh socket to an existing identity after a page reload or
     * a reconnect. Player ids are derived from the username, so the id sent by
     * the client can be validated against the username before binding.
     */
    public Player handleResume(WebSocket conn, JSONObject json) {
        JSONObject payload = json.optJSONObject("payload");
        if (payload == null) return null;

        String playerId = payload.optString("id", "").trim();
        String username = payload.optString("username", "").trim();
        if (playerId.isEmpty() || username.isEmpty()) return null;

        Player player = new Player(username);
        if (!player.getId().toString().equals(playerId)) return null;

        bind(conn, player);
        return player;
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
        String type = json.getString("subtype");
        switch (type) {
            case "login":
                JSONObject response = new JSONObject();
                response.put("type", "auth");
                try {
                    Player currentPlayer = handleLogin(conn, json);
                    response.put("subtype", "login_success");
                    response.put("payload", new JSONObject().put("username", currentPlayer.getUsername()).put("id", currentPlayer.getId().toString()));
                    System.out.println("Player logged in: " + currentPlayer.getUsername());
                } catch (Exception e) {
                    System.out.println(e);
                    response.put("subtype", "login_fail");
                }
                conn.send(response.toString());
                break;
            case "resume":
                JSONObject resumeResponse = new JSONObject();
                resumeResponse.put("type", "auth");
                try {
                    Player resumed = handleResume(conn, json);
                    if (resumed == null) {
                        resumeResponse.put("subtype", "resume_fail");
                    } else {
                        resumeResponse.put("subtype", "resume_success");
                        resumeResponse.put("payload", new JSONObject()
                                .put("username", resumed.getUsername())
                                .put("id", resumed.getId().toString()));
                        System.out.println("Player resumed: " + resumed.getUsername());
                    }
                } catch (Exception e) {
                    System.out.println(e);
                    resumeResponse.put("subtype", "resume_fail");
                }
                conn.send(resumeResponse.toString());
                break;
            default:
                System.out.println("Unknown auth subtype: " + type);
                break;
        }
    }

    public Player getPlayerByConnection(WebSocket conn) {
        return onlinePlayers.get(conn);
    }

    public Player getPlayerById(String playerId) {
        return onlinePlayers.values().stream().filter(player -> player.getId().toString().equals(playerId)).findFirst().orElse(null);
    }

    public WebSocket getConnectionByPlayerId(String playerId) {
        return onlinePlayers.values().stream().map(Player::getId).filter(id -> id.toString().equals(playerId)).findFirst()
                .map(id -> onlinePlayers.entrySet().stream().filter(entry -> entry.getValue().getId().equals(id)).findFirst().orElse(null))
                .map(Map.Entry::getKey).orElse(null);
    }
}
