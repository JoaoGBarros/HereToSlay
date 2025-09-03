package org.br.heretoslay.entity;

import java.util.UUID;

public class Player {

    private UUID id;
    private String username;
    private GameStatus status;


    public Player(String username) {
        this.username = username;
        this.id = UUID.nameUUIDFromBytes(username.getBytes());
        this.status = GameStatus.ONLINE;
    }

    public UUID getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public GameStatus getStatus() {
        return status;
    }

    public void setStatus(GameStatus status) {
        this.status = status;
    }

}
