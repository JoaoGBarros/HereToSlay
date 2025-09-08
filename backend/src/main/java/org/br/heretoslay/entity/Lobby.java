package org.br.heretoslay.entity;

import org.java_websocket.WebSocket;

import java.util.HashSet;
import java.util.Set;
import java.util.Timer;
import java.util.TimerTask;

public class Lobby {

    private Long id;
    private String name;
    private int maxPlayers;
    private int minPlayers;
    private LobbyStatus status;
    private Set<WebSocket> players;
    private transient Timer countdownTimer;
    private transient int countdownTimeLeft = -1;

    public static final int COUNTDOWN_SECONDS = 5;

    public Lobby (Long id, String name, int maxPlayers, int minPlayers) {
        this.id = id;
        this.name = name;
        this.maxPlayers = maxPlayers;
        this.minPlayers = minPlayers;
        this.status = LobbyStatus.CREATED;
        this.players = new HashSet<>();
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

    public int getCountdownTimeLeft() {
        return countdownTimeLeft;
    }

    public void startCountdown(Runnable onFinish, Runnable onTick) {
        if (countdownTimer != null) {
            countdownTimer.cancel();
        }
        countdownTimeLeft = COUNTDOWN_SECONDS;
        countdownTimer = new Timer();
        countdownTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                countdownTimeLeft--;
                if (onTick != null) onTick.run();
                if (countdownTimeLeft <= 0) {
                    countdownTimer.cancel();
                    countdownTimer = null;
                    countdownTimeLeft = -1;
                    if (onFinish != null) onFinish.run();
                }
            }
        }, 1000, 1000);
    }

    public void resetCountdown() {
        if (countdownTimer != null) {
            countdownTimer.cancel();
            countdownTimer = null;
        }
        countdownTimeLeft = -1;
    }
}