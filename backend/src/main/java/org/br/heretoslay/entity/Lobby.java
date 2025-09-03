package org.br.heretoslay.entity;

import org.java_websocket.WebSocket;

import java.util.HashSet;
import java.util.Set;

public class Lobby {

    private Long id;
    private String name;
    private int maxPlayers;
    private int minPlayers;
    private LobbyStatus status;
    private Set<WebSocket> players;


    public Lobby (Long id, String name, int maxPlayers, int minPlayers) {
        this.id = id;
        this.name = name;
        this.maxPlayers = maxPlayers;
        this.minPlayers = minPlayers;
        this.status = LobbyStatus.CREATED;
        this.players = new HashSet<WebSocket>();
    }

    public Long getId() {
        return id;
    }

    public void addPlayer(WebSocket conn){

        if(players.size() >= maxPlayers) {
            throw new IllegalStateException("Lobby is full");
        }

        players.add(conn);
    }

    public String getName() {
        return name;
    }

    public int getMaxPlayers() {
        return maxPlayers;
    }

    public int getMinPlayers() {
        return minPlayers;
    }

    public LobbyStatus getStatus() {
        return status;
    }

    public void setStatus(LobbyStatus status) {
        this.status = status;
    }

    public Set<WebSocket> getPlayers() {
        return players;
    }




}
