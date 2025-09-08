package org.br.heretoslay.entity;

import org.br.heretoslay.auth.AuthService;
import org.java_websocket.WebSocket;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class Match {

    private final Map<WebSocket, GameState> players = new ConcurrentHashMap<>();
    

    public void startMatch(List<WebSocket> connections) {
        for (WebSocket conn : connections) {
            GameState gameState = new GameState(PartyLeader.BARD, List.of("Carta 1", "Carta 2"), List.of("Carta A", "Carta B"), AuthService.getInstance().getPlayerByConnection(conn).getUsername());
            players.put(conn, gameState);
        }
    }



}
