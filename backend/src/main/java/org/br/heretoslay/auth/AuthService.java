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
        onlinePlayers.put(conn, player);
        return player;
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
            default:
                System.out.println("Unknown auth subtype: " + type);
                break;
        }
    }

    public Player getPlayerByConnection(WebSocket conn) {
        return onlinePlayers.get(conn);
    }
}
