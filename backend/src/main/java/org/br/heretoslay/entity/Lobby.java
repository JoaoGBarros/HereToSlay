package org.br.heretoslay.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.java_websocket.WebSocket;

import java.util.HashSet;
import java.util.Set;
import java.util.Timer;
import java.util.TimerTask;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Lobby {

    private Long id;
    private String name;
    private int maxPlayers;
    private int minPlayers;
    private LobbyStatus status;
    private Set<String> players;
    private Set<String> readyPlayers = new HashSet<>();
    @JsonIgnore
    private final transient ChatLog chat = new ChatLog();
    @JsonIgnore
    private transient Timer countdownTimer;
    @JsonIgnore
    private transient int countdownTimeLeft = -1;

    public static final int COUNTDOWN_SECONDS = 5;


    public Lobby() {
    }

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

    public void addPlayer(String id){

        if(players.size() >= maxPlayers && !players.contains(id)) {
            throw new IllegalStateException("Lobby is full");
        }

        players.add(id);
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

    public Set<String> getPlayers() {
        return players;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setMaxPlayers(int maxPlayers) {
        this.maxPlayers = maxPlayers;
    }

    public void setMinPlayers(int minPlayers) {
        this.minPlayers = minPlayers;
    }

    public void setPlayers(Set<String> players) {
        this.players = players;
    }

    public void removePlayer(String id) {
        players.remove(id);
        readyPlayers.remove(id);
    }

    public Set<String> getReadyPlayers() {
        return readyPlayers;
    }

    public void setReadyPlayers(Set<String> readyPlayers) {
        this.readyPlayers = readyPlayers == null ? new HashSet<>() : readyPlayers;
    }

    public void setReady(String id, boolean ready) {
        if (!players.contains(id)) return;
        if (ready) {
            readyPlayers.add(id);
        } else {
            readyPlayers.remove(id);
        }
    }

    /** The match only starts once the minimum is reached and every seated player is ready. */
    @JsonIgnore
    public boolean isReadyToStart() {
        return players.size() >= minPlayers && readyPlayers.containsAll(players);
    }

    @JsonIgnore
    public ChatLog getChat() {
        return chat;
    }

    @JsonIgnore
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
                if (!isReadyToStart()) {
                    resetCountdown();
                    if (onTick != null) onTick.run();
                    return;
                }

                countdownTimeLeft--;

                if (onTick != null) onTick.run();

                if (countdownTimeLeft <= 0) {
                    resetCountdown();
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