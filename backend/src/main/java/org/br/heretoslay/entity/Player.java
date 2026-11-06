package org.br.heretoslay.entity;

/**
 * A signed-in player. The id is the player's Firebase uid and the username comes from the
 * "username" claim the accounts API puts on their Firebase account, so both are trusted.
 */
public class Player {

    private String id;
    private String username;
    private GameStatus status;

    public Player(String id, String username) {
        this.id = id;
        this.username = username;
        this.status = GameStatus.ONLINE;
    }

    public Player() {
        this.status = GameStatus.ONLINE;
    }

    public String getId() {
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

    public void setId(String id) {
        this.id = id;
    }

    public void setUsername(String username) {
        this.username = username;
    }
}
