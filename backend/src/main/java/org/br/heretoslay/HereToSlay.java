package org.br.heretoslay;

import org.br.heretoslay.auth.AuthService;
import org.br.heretoslay.lobby.LobbyService;
import org.br.heretoslay.match.MatchService;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONObject;

import java.net.InetSocketAddress;

public class HereToSlay extends WebSocketServer {

    private final AuthService authService = AuthService.getInstance();
    private final LobbyService lobbyService = LobbyService.getInstance();
    private final MatchService matchService = MatchService.getInstance();

    public HereToSlay(int port) {
        super(new InetSocketAddress(port));
    }

    public static void main(String[] args) {
        int port = 8887;
        HereToSlay server = new HereToSlay(port);
        server.start();
    }



    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("onOpen");
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        System.out.println("onClose");
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        JSONObject obj = new JSONObject(message);
        String type = obj.getString("type");
        switch (type) {
            case "auth":
                authService.handleMessage(conn, obj);
                break;
            case "lobby":
                lobbyService.handleMessage(conn, obj);
                break;
                case "match":
                    matchService.handleMessage(conn, obj);

        }
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        ex.printStackTrace();
    }

    @Override
    public void onStart() {
        System.out.println("onStart");
    }
}